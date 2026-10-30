"""Granting an authorization is two people's decision (H8): the Technical
Manager recommends, the Country Manager authorises. Tests that need a person
who is already authorised use this rather than reaching round the rule."""
from modules.people.service import PeopleService

TM = {"user_id": "USR-TM-TEST", "role_id": 7, "site_id": "SITE-01"}
CM = {"user_id": "USR-CM-TEST", "role_id": 1, "site_id": "SITE-01"}


async def authorise(authorization_id: str, site_id: str = "SITE-01", reason=None):
    await PeopleService.recommend_authorization(authorization_id, site_id, TM)
    return await PeopleService.decide_authorization(
        authorization_id, "authorized", site_id, CM["user_id"], reason, CM
    )
