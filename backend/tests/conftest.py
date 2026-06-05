"""Test configuration for backend tests."""

import sys
import os

# Ensure the backend directory is on the Python path so that 'src' resolves
# to the project source rather than any system-level 'src' package.
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Remove any system-level 'src' module so our project's src takes precedence
if "src" in sys.modules:
    existing = sys.modules["src"]
    if hasattr(existing, "__file__") and existing.__file__ and "site-packages" in existing.__file__:
        del sys.modules["src"]
        # Also remove any submodules
        for key in list(sys.modules.keys()):
            if key.startswith("src."):
                del sys.modules[key]
