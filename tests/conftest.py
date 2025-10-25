import pytest
from fastapi.testclient import TestClient

# Import the FastAPI app from the project
from src.app import app


@pytest.fixture(scope="module")
def client():
    """
    Provide a TestClient for the FastAPI app for tests.
    """
    with TestClient(app) as c:
        yield c
import pytest
from fastapi.testclient import TestClient

# Import your FastAPI app object. Adjust if your app variable/module differs.
# This expects `app` to be defined in src/app.py (e.g. app = FastAPI()).
from src.app import app


@pytest.fixture(scope="module")
def client():
    """
    TestClient fixture for module-scoped tests.
    Provides a synchronous TestClient for FastAPI apps.
    """
    with TestClient(app) as c:
        yield c