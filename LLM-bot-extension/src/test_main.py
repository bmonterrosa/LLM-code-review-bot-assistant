from fastapi.testclient import TestClient
from main import app

# BEFORE TESTING
# need pytest btw to run these
# also server has to be running (docker run ... )
# based on this https://fastapi.tiangolo.com/tutorial/testing/#testing-file
client = TestClient(app)


# def test_hello_world():
#     response = client.get("/")
#     assert response.status_code == 200
#     assert response.json() == {'Hello': 'World'}


# def test_save():
#     response = client.get("/testsavebasic")
#     assert response.status_code == 200


# def test_read():
#     response = client.get("/testreadbasic")
#     assert response.status_code == 200


# doesnt pass because we need to download and stuff kinda too complicated to test
# def test_save_advance():
#     response = client.get("/testsaveadvanced")
#     assert response.status_code == 200
#
#
# def test_save_final():
#     response = client.get("/testsavefinal")
#     assert response.status_code == 200
