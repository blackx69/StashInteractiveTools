import json
import os
import os.path
import re
import shutil
import sys
import traceback
import urllib.parse
from datetime import datetime
from pathlib import Path

import stashapi.log as log
from stashapi.stashapp import StashInterface

DEBUG = False
ID = 'StashInteractiveTools'
stash: StashInterface
PLUGIN_DIR = ''
PLUGIN_HTTP_ASSETS_PATH = ''
FRAGMENT = {}


def init():
    global stash, PLUGIN_DIR, PLUGIN_HTTP_ASSETS_PATH, FRAGMENT
    mode = 'init'
    if DEBUG or os.environ.get('STASH_INTERACTIVE_TOOLS_DEBUG'):
        f = open('./payload.json')
        FRAGMENT = json.load(f)
        f.close()

    else:
        FRAGMENT = json.loads(sys.stdin.read())
        mode = FRAGMENT["args"]["mode"]

    stash = StashInterface(FRAGMENT["server_connection"])
    PLUGIN_DIR = FRAGMENT["server_connection"]['PluginDir']
    PLUGIN_HTTP_ASSETS_PATH = stash.url.replace('/graphql',
                                                '/plugin/StashInteractiveTools/assets')
    return mode


def fetch_config():
    config = stash.find_plugin_config(ID)
    enable = bool(config.get('enable_tagging'))
    tag_name = config.get('multi_script_tag')
    naming_convention = config.get('naming_convention')
    if not tag_name:
        tag_name = '[SIT: Multi-Script]'
    return enable, tag_name, naming_convention



ENABLE_TAGGING = False
TAG_NAME = '[SIT: Multi-Script]'
NAMING_CONVENTION = ''



def parse_label_regex(script_filename, file_filename):
    pass


def parse_label_default(script_filename, file_filename):
    same_name = script_filename == file_filename
    label = 'Default' if same_name else script_filename.replace(
        file_filename, '')
    return re.sub(r'[()]', '', label).strip()


def map_script(script, file, scene_id):
    output = os.path.join(PLUGIN_DIR, '.scripts', scene_id)                                      # type: ignore
    if not os.path.exists(output):
        os.makedirs(output, exist_ok=True)

    file_filename = os.path.splitext(os.path.basename(file))[0]
    script_base_name = os.path.basename(script)
    script_filename = os.path.splitext(script_base_name)[0]

    shutil.copyfile(script, os.path.join(output, script_base_name))

    path = f'{PLUGIN_HTTP_ASSETS_PATH}/.scripts/{scene_id}/{urllib.parse.quote(script_filename)}.funscript'
    parser = parse_label_default if not NAMING_CONVENTION else parse_label_regex
    label = parser(script_filename, file_filename)
    return {'label': label, 'path': path}


VIDEO_EXTENSIONS = ['mp4', 'mov', 'wmv', 'avi', 'mkv']


def filter_out_false_versions(base_name, file):
    file_dir = os.path.dirname(file)
    name = os.path.splitext(os.path.basename(file))[0]
    # keep
    if name == base_name:
        return True
    for ext in VIDEO_EXTENSIONS:
        to_check = os.path.join(file_dir, f'{name}.{ext}')
        if os.path.exists(to_check):
            return False
    return True


def get_funscripts(file):
    filename = os.path.basename(file)
    file_dir = Path(os.path.dirname(file))
    name = os.path.splitext(filename)[0]
    files = list(file_dir.glob(f'{name}*.funscript'))
    return list(filter(lambda f: filter_out_false_versions(name, f), files))


def analyze_file(file, scene_id):
    files = get_funscripts(file)
    return list(map(lambda script: map_script(script, file, scene_id), files))


def analyze_scene():
    scene_id = FRAGMENT["args"]['scene_id']
    scene = stash.find_scene(scene_id)
    # log.info(json.dumps(scene))
    if scene['interactive']:
        return analyze_file(scene['files'][0]['path'], scene_id)
    return []


SCENE_FRAGMENT = """
id
tags { id }
files {
 path
}
"""

BULK_SCENE_UPDATE = "mutation BulkSceneUpdate($input: BulkSceneUpdateInput!) {\n  bulkSceneUpdate(input: $input) { id } } "


def update_tags(ids, mode='ADD'):
    tag_id = stash.find_tag(TAG_NAME, create=True).get('id')
    stash.call_GQL(BULK_SCENE_UPDATE, {
        'input': {'ids': ids,
                  'tag_ids': {
                      'mode': mode,
                      'ids': [tag_id]
                  }
                  }
    })


def tag_scenes():
    page = 1
    total = -1
    seen = 0
    fetch_config()

    while seen != total:
        to_tag = []
        total, scenes = stash.find_scenes({
            'interactive': True
        }, {
            'page': page,
            'per_page': 100,
            'direction': 'DESC',
            'sort': 'created_at'
        }, "", SCENE_FRAGMENT, True)
        seen += len(scenes)
        log.debug(f'Processing {len(scenes)}')
        if not len(scenes):
            break
        for scene in scenes:
            file = scene['files'][0]['path']
            log.debug(f'Scanning {file}')
            if len(get_funscripts(file)) > 1:
                to_tag.append(scene['id'])
        if len(to_tag):
            update_tags(to_tag)
        page += 1


def main():
    global ENABLE_TAGGING, TAG_NAME,NAMING_CONVENTION
    mode = init()
    ENABLE_TAGGING,TAG_NAME,NAMING_CONVENTION = fetch_config()
    # Only run 'init' when a scene id has been passed
    if mode == 'init' and 'scene_id' in FRAGMENT['args']:
        scripts = analyze_scene()
        log.debug({'scripts': scripts})
        log.exit()
    elif mode == 'tag':
        tag_scenes()
        log.exit()


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        f = open(
            'error-{}.json'.format(datetime.now().strftime("%Y%m%d-%H%M%S")),
            'w+')
        if isinstance(FRAGMENT, dict):
            f.write(FRAGMENT['args'])
        f.write(traceback.format_exc())
        f.close()
