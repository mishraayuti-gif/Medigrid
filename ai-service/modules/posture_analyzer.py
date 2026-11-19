"""
MediaPipe Pose Landmarker Posture Rules Module for MindCare AI.
Evaluates explicit posture geometry rules for supported upper-body wellness exercises:
  - upright_alignment (Seated Upright Posture Alignment)
  - neck_tilt_release (Neck & Shoulder Desk Release)
  - overhead_reach (Overhead Mountain Reach)
  - shoulder_level (General Shoulder Symmetry)

Does NOT claim universal pose recognition or webcam-based breathing measurement.
"""

from typing import Dict, Any, Optional
import math
import numpy as np

try:
    import cv2
    import mediapipe as mp
    MEDIAPIPE_AVAILABLE = True
except ImportError:
    cv2 = None
    mp = None
    MEDIAPIPE_AVAILABLE = False


class PostureRuleAnalyzer:
    def __init__(self) -> None:
        self.pose = None
        if MEDIAPIPE_AVAILABLE:
            self.mp_pose = mp.solutions.pose
            self.pose = self.mp_pose.Pose(
                static_image_mode=False,
                model_complexity=1,
                min_detection_confidence=0.55,
                min_tracking_confidence=0.55,
            )

    def analyze_image_bytes(self, image_bytes: bytes, rule_key: str) -> Dict[str, Any]:
        if not MEDIAPIPE_AVAILABLE or self.pose is None:
            return {
                "available": False,
                "postureOk": False,
                "score": 0,
                "feedback": "MediaPipe or OpenCV is not installed in this Python environment. Use guided timer fallback.",
                "landmarks": [],
            }

        np_arr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if frame is None:
            return {
                "available": True,
                "postureOk": False,
                "score": 0,
                "feedback": "Unable to decode video frame.",
                "landmarks": [],
            }

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.pose.process(rgb)
        if not results.pose_landmarks:
            return {
                "available": True,
                "postureOk": False,
                "score": 0,
                "feedback": "Center your head and shoulders in view of the camera.",
                "landmarks": [],
            }

        lm = results.pose_landmarks.landmark
        return self.evaluate_landmarks(lm, rule_key)

    def evaluate_landmarks(self, lm: Any, rule_key: str) -> Dict[str, Any]:
        # Landmark indices (MediaPipe Pose 33-point model)
        NOSE = 0
        LEFT_EAR = 7
        RIGHT_EAR = 8
        LEFT_SHOULDER = 11
        RIGHT_SHOULDER = 12
        LEFT_WRIST = 15
        RIGHT_WRIST = 16

        ls = lm[LEFT_SHOULDER]
        rs = lm[RIGHT_SHOULDER]
        nose = lm[NOSE]
        le = lm[LEFT_EAR]
        re = lm[RIGHT_EAR]
        lw = lm[LEFT_WRIST]
        rw = lm[RIGHT_WRIST]

        shoulder_diff = abs(ls.y - rs.y)
        shoulder_mid_x = (ls.x + rs.x) / 2.0
        shoulder_mid_y = (ls.y + rs.y) / 2.0
        head_offset = abs(nose.x - shoulder_mid_x)

        score = 100
        feedback = "Balanced alignment detected."
        posture_ok = True

        if rule_key == "upright_alignment":
            if shoulder_diff > 0.045:
                score -= 30
                posture_ok = False
                feedback = "Level both shoulders—drop the higher shoulder gently."
            elif head_offset > 0.06:
                score -= 25
                posture_ok = False
                feedback = "Center your head directly above your shoulders."
            else:
                feedback = "Great upright alignment—keep breathing steadily."

        elif rule_key == "neck_tilt_release":
            ear_diff = abs(le.y - re.y)
            if shoulder_diff > 0.05:
                score -= 35
                posture_ok = False
                feedback = "Keep shoulders relaxed and level while tilting only your neck."
            elif ear_diff < 0.025:
                score -= 10
                feedback = "Gently tilt one ear toward your shoulder when ready, or hold center reset."
            else:
                feedback = "Smooth controlled neck stretch with steady shoulders."

        elif rule_key == "overhead_reach":
            wrists_above = lw.y < ls.y - 0.08 and rw.y < rs.y - 0.08
            wrist_symmetry = abs(lw.y - rw.y)
            if not wrists_above:
                score -= 35
                posture_ok = False
                feedback = "Raise both wrists smoothly above shoulder height without shrugging."
            elif wrist_symmetry > 0.07:
                score -= 20
                posture_ok = False
                feedback = "Even out left and right arm height overhead."
            else:
                feedback = "Strong symmetrical overhead reach."

        else:
            if shoulder_diff > 0.05:
                score -= 30
                posture_ok = False
                feedback = "Soften and level your shoulders."

        serialized = [
            {"x": round(float(p.x), 4), "y": round(float(p.y), 4), "visibility": round(float(p.visibility), 3)}
            for p in [nose, le, re, ls, rs, lw, rw]
        ]

        return {
            "available": True,
            "postureOk": posture_ok,
            "score": max(0, min(100, int(score))),
            "feedback": feedback,
            "metrics": {
                "shoulderDiff": round(float(shoulder_diff), 4),
                "headOffset": round(float(head_offset), 4),
            },
            "landmarks": serialized,
        }
