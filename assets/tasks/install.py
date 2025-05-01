import subprocess
import sys

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



def run():
    install_and_import('stashapi','stashapp-tools')

