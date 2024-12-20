import json
import os.path
import glob
import re
import shutil
import sys
import urllib.parse
from pathlib import Path

import stashapi.log as log
from stashapi.stashapp import StashInterface

DEBUG = False
ID = 'StashInteractiveTools'
if DEBUG:
    f = open('./payload.json')
    FRAGMENT = json.load(f)
    MODE = 'init'
else:
    FRAGMENT = json.loads(sys.stdin.read())
    MODE = FRAGMENT["args"]["mode"]

stash = StashInterface(FRAGMENT["server_connection"])
PLUGIN_DIR = FRAGMENT["server_connection"]['PluginDir']
PLUGIN_HTTP_ASSETS_PATH = stash.url.replace('/graphql',
                                            '/plugin/StashInteractiveTools/assets').replace(
    '127.0.0.1', 'localhost')


def fetch_config():
    config = stash.find_plugin_config(ID)
    enable = bool(config.get('enable_tagging'))
    tag_name = config.get('multi_script_tag')
    if not tag_name:
        tag_name = '[SIT: Multi-Script]'
    return enable, tag_name


ENABLE_TAGGING, TAG_NAME = fetch_config()


def map_script(script, file, scene_id):
    output = os.path.join(PLUGIN_DIR, '.scripts', scene_id)
    if not os.path.exists(output):
        os.makedirs(output, exist_ok=True)

    file_filename = os.path.splitext(os.path.basename(file))[0]
    script_base_name = os.path.basename(script)
    script_filename = os.path.splitext(script_base_name)[0]

    shutil.copyfile(script, os.path.join(output, script_base_name))
    label = 'Default' if script_filename == file_filename else script_filename.replace(
        file_filename, '')

    path = f'{PLUGIN_HTTP_ASSETS_PATH}/.scripts/{scene_id}/{urllib.parse.quote(script_filename)}.funscript'

    label = re.sub(r'[()]', '', label).strip()
    return {'label': label, 'path': path}


VIDEO_EXTENSIONS = ['mp4', 'mov', 'wmv', 'avi']


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
    name_escaped = glob.escape(name)
    files = list(file_dir.glob(f'{name_escaped}*.funscript'))
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
    if MODE == 'init':
        scripts = analyze_scene()
        log.debug({'scripts': scripts})
        log.exit()
    elif MODE == 'tag':
        tag_scenes()
        log.exit()


if __name__ == "__main__":
    main()
