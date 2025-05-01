from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from assets.config import Config

import time
config:'Config'

BULK_SCENE_UPDATE = "mutation BulkSceneUpdate($input: BulkSceneUpdateInput!) {\n  bulkSceneUpdate(input: $input) { id } } "
SCENE_FRAGMENT = """
id
tags { id }
files {
 path
}
"""
def tag_scenes():
    page = 1
    total = -1
    seen = 0
    init_task = config.get_task('init')


    while seen != total:
        to_tag = []
        total, scenes = config.stash.find_scenes({
            'interactive': True
        }, {
            'page': page,
            'per_page': 10,
            'direction': 'DESC',
            'sort': 'created_at'
        }, "", SCENE_FRAGMENT, True)
        seen += len(scenes)
        if not len(scenes):
            break
        for scene in scenes:
            file = scene['files'][0]['path']
            #config.log.debug(f'Scanning {file}')
            if len(init_task.get_funscripts(file)) > 1:
                to_tag.append(scene['id'])
        if len(to_tag):
            update_tags(to_tag)
            time.sleep(0.500)
        config.log.progress(seen/total)
        page += 1
def update_tags(ids, mode='ADD'):
    tag_id = config.stash.find_tag(config.TAG_NAME, create=True).get('id')
    config.stash.call_GQL(BULK_SCENE_UPDATE, {
        'input': {'ids': ids,
                  'tag_ids': {
                      'mode': mode,
                      'ids': [tag_id]
                  }
                  }
    })
def run(c:'Config'):
    global config
    config = c
    tag_scenes()


