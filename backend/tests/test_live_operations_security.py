import tempfile
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient
from pydantic import ValidationError
from starlette.websockets import WebSocketDisconnect

import backend.app.database as database_module
import backend.app.main as main_module
from backend.app.models import HistoryCreate
from backend.app.ssh_service import SSHServiceError


class HistoryValidationTests(unittest.TestCase):
    def test_normal_action_is_accepted(self) -> None:
        payload = HistoryCreate(host_id="server-one", action="Routine patching", result="Success")
        self.assertEqual(payload.action, "Routine patching")

    def test_action_and_details_are_trimmed(self) -> None:
        payload = HistoryCreate(
            host_id="server-one",
            action="  Routine patching  ",
            result="Success",
            details="  Completed normally  ",
        )
        self.assertEqual(payload.action, "Routine patching")
        self.assertEqual(payload.details, "Completed normally")

    def test_blank_action_is_rejected(self) -> None:
        with self.assertRaises(ValidationError):
            HistoryCreate(host_id="server-one", action="   ", result="Success")

    def test_blank_details_become_none(self) -> None:
        payload = HistoryCreate(
            host_id="server-one", action="Routine patching", result="Success", details="   "
        )
        self.assertIsNone(payload.details)


class EndpointValidationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_directory = tempfile.TemporaryDirectory()
        self.database_patch = patch.object(
            database_module, "DATABASE_PATH", Path(self.temp_directory.name) / "test.db"
        )
        self.database_patch.start()
        self.client_context = TestClient(main_module.app)
        self.client = self.client_context.__enter__()

    def tearDown(self) -> None:
        self.client_context.__exit__(None, None, None)
        self.database_patch.stop()
        self.temp_directory.cleanup()

    def test_history_api_stores_trimmed_values_and_rejects_blank_action(self) -> None:
        accepted = self.client.post(
            "/api/history",
            json={
                "host_id": "server-one",
                "action": "  Routine patching  ",
                "result": "Success",
                "details": "   ",
            },
        )
        self.assertEqual(accepted.status_code, 201)
        self.assertEqual(accepted.json()["action"], "Routine patching")
        self.assertIsNone(accepted.json()["details"])

        rejected = self.client.post(
            "/api/history",
            json={"host_id": "server-one", "action": "   ", "result": "Success"},
        )
        self.assertEqual(rejected.status_code, 422)

    def assert_origin_is_accepted(self, origin: str) -> None:
        connector = AsyncMock(
            side_effect=SSHServiceError("ssh_not_configured", "SSH is not enabled for this inventory host")
        )
        with patch.object(main_module, "connect_host", connector):
            with self.client.websocket_connect(
                "/ws/ssh/server-one", headers={"origin": origin}
            ) as websocket:
                message = websocket.receive_json()
        self.assertEqual(message["code"], "ssh_not_configured")
        connector.assert_awaited_once()

    def test_localhost_origin_is_accepted(self) -> None:
        self.assert_origin_is_accepted("http://localhost:5173")

    def test_loopback_origin_is_accepted(self) -> None:
        self.assert_origin_is_accepted("http://127.0.0.1:5173")

    def test_configured_cors_origin_is_accepted(self) -> None:
        configured_origin = "https://console.example.test"
        with patch.object(main_module, "allowed_origins", [configured_origin]):
            self.assert_origin_is_accepted(configured_origin)

    def test_configured_origins_replace_defaults(self) -> None:
        with patch.dict(
            "os.environ",
            {"FRONTEND_PORT": "5174", "CORS_ORIGINS": "https://one.example.test, https://two.example.test"},
            clear=False,
        ):
            self.assertEqual(
                main_module.get_allowed_origins(),
                ["https://one.example.test", "https://two.example.test"],
            )

    def assert_origin_is_rejected_before_ssh(self, headers: dict[str, str]) -> None:
        connector = AsyncMock()
        with patch.object(main_module, "connect_host", connector):
            with self.assertRaises(WebSocketDisconnect) as error:
                with self.client.websocket_connect("/ws/ssh/server-one", headers=headers):
                    pass
        self.assertEqual(error.exception.code, 1008)
        connector.assert_not_awaited()

    def test_disallowed_origin_is_rejected_before_ssh(self) -> None:
        self.assert_origin_is_rejected_before_ssh({"origin": "https://malicious.example"})

    def test_missing_origin_is_rejected_before_ssh(self) -> None:
        self.assert_origin_is_rejected_before_ssh({})


if __name__ == "__main__":
    unittest.main()
