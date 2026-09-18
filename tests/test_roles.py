import unittest

from fastapi.testclient import TestClient

from src.app import app


class RoleManagementTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_login_returns_role_for_staff_user(self):
        response = self.client.post(
            "/auth/login",
            json={"email": "admin@mergington.edu", "password": "admin123"},
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["role"], "admin")
        self.assertEqual(payload["email"], "admin@mergington.edu")

    def test_student_cannot_unregister_participants(self):
        response = self.client.delete(
            "/activities/Chess Club/unregister?email=michael@mergington.edu",
            headers={"X-User-Role": "student", "X-User-Email": "student@mergington.edu"},
        )

        self.assertEqual(response.status_code, 403)
        self.assertIn("Only club leaders and admins", response.json()["detail"])

    def test_admin_can_unregister_participants(self):
        response = self.client.delete(
            "/activities/Chess Club/unregister?email=michael@mergington.edu",
            headers={"X-User-Role": "admin", "X-User-Email": "admin@mergington.edu"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("Unregistered", response.json()["message"])


if __name__ == "__main__":
    unittest.main()
