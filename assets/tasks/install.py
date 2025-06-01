import subprocess
import sys
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from assets.config import Config




def install_and_import(module_name, package_name):
    import importlib
    try:
        importlib.import_module(module_name)
    except ImportError:
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", package_name])
        except subprocess.CalledProcessError as e:
            print(f"Failed to install {package_name}: {e}")
    finally:
        globals()[module_name] = importlib.import_module(module_name)



def run(c:'Config'):
    install_and_import('stashapi','stashapp-tools')

