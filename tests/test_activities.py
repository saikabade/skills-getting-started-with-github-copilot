import pytest
from urllib.parse import quote


def test_get_activities(client):
    """GET /activities should return a mapping (possibly empty)"""
    res = client.get("/activities")
    assert res.status_code == 200, f"GET /activities returned {res.status_code}"
    data = res.json()
    assert isinstance(data, dict), "expected JSON object (dict) from /activities"
    # Each key should be a string (activity name). No strict assertion on contents.
    for k in data.keys():
        assert isinstance(k, str)


def test_signup_and_delete_flow(client):
    """
    Sign up a test email for the first available activity, check it's present,
    then DELETE it and check it's gone.
    """
    res = client.get("/activities")
    assert res.status_code == 200
    activities = res.json()
    if not activities:
        pytest.skip("No activities available to run signup/delete test")

    # Choose first activity name
    activity = next(iter(activities.keys()))
    # Use a test email without '+' to avoid URL-decoding issues in query strings
    test_email = "test-pytest@example.com"
    encoded_email = quote(test_email, safe="")

    # POST signup (endpoint used by the frontend: /activities/{activity}/signup?email=...)
    post_res = client.post(f"/activities/{activity}/signup?email={encoded_email}")
    assert post_res.status_code in (200, 201), f"signup POST returned {post_res.status_code}"

    # Fetch activities and ensure the participant appears
    res_after = client.get("/activities")
    assert res_after.status_code == 200
    activities_after = res_after.json()
    participants = activities_after.get(activity, {}).get("participants", [])
    assert isinstance(participants, list)
    assert test_email in participants, "test email not found in participants after signup"

    # DELETE the signup
    del_res = client.delete(f"/activities/{activity}/signup?email={encoded_email}")
    assert del_res.status_code in (200, 204), f"DELETE returned {del_res.status_code}"

    # Verify removal
    final = client.get("/activities")
    participants_final = final.json().get(activity, {}).get("participants", [])
    assert test_email not in participants_final, "test email still present after DELETE"