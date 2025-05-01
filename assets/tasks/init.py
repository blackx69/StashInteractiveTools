import glob
import os
import os.path
import re
import shutil
import urllib.parse
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from assets.config import Config


config:'Config'
def parse_label_regex(script_filename, file_filename):
    pass


def parse_label_default(script_filename, file_filename):
    same_name = script_filename == file_filename
    label = 'Default' if same_name else script_filename.replace(
        file_filename, '')
    return re.sub(r'[()]', '', label).strip()


def map_script(script, file, scene_id):
    output = os.path.join(config.PLUGIN_DIR, '.scripts', scene_id)                                      # type: ignore
    if not os.path.exists(output):
        os.makedirs(output, exist_ok=True)

    file_filename = os.path.splitext(os.path.basename(file))[0]
    script_base_name = os.path.basename(script)
    script_filename = os.path.splitext(script_base_name)[0]

    shutil.copyfile(script, os.path.join(output, script_base_name))

    path = f'{config.PLUGIN_HTTP_ASSETS_PATH}/.scripts/{scene_id}/{urllib.parse.quote(script_filename)}.funscript'
    parser = parse_label_default if not config.NAMING_CONVENTION else parse_label_regex
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


def deterministic_sort_scripts(scripts):
    return sorted(scripts, key=lambda x: (x['label'] != 'Default', x['label']))

def get_funscripts(file):
    filename = os.path.basename(file)
    file_dir = Path(os.path.dirname(file))
    name = os.path.splitext(filename)[0]
    name_escaped = glob.escape(name)
    files = list(file_dir.glob(f'{name_escaped}*.funscript'))
    return list(filter(lambda f: filter_out_false_versions(name, f), files))


def analyze_file(file, scene_id):
    files = get_funscripts(file)
    return deterministic_sort_scripts(list(map(lambda script: map_script(script, file, scene_id), files)))


def analyze_scene():

    if 'scene_id' not in config.FRAGMENT['args']:
        return
    scene_id = config.FRAGMENT["args"]['scene_id']
    scene = config.stash.find_scene(scene_id)
    # log.info(json.dumps(scene))
    if scene['interactive']:
        return analyze_file(scene['files'][0]['path'], scene_id)
    return []


def run(c:'Config'):
    global config
    config = c
    scripts = analyze_scene()
    config.log.exit({'scripts': scripts})






