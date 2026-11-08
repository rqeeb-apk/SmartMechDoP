import React, { useRef, useEffect } from 'react';
import { DoctorPose, VisemeFrame } from './LectureTimelineEngine';

interface VirtualInstructorCanvasProps {
  doctorAvatarUrl?: string;
  doctorName?: string;
  pose: DoctorPose;
  viseme: VisemeFrame;
  handTargetX?: number;
  handTargetY?: number;
  isSpeaking: boolean;
  lowResourceMode?: boolean;
}

export const VirtualInstructorCanvas: React.FC<VirtualInstructorCanvasProps> = ({
  doctorAvatarUrl,
  doctorName = 'دكتور الميكاترونكس الذكي',
  pose,
  viseme,
  handTargetX = 200,
  handTargetY = 150,
  isSpeaking,
  lowResourceMode = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Animated Joints Kinematic state for smooth LERP interpolation
  const currentJoints = useRef({
    bodyX: 200, // Position on classroom stage
    bodyY: 180,
    headAngle: 0,
    eyeBlink: 0,
    rightHandX: 220,
    rightHandY: 260,
    leftHandX: 180,
    leftHandY: 260,
    penGlow: 0,
    laserDotX: 0,
    laserDotY: 0,
  });

  const avatarImgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (doctorAvatarUrl) {
      const img = new Image();
      img.src = doctorAvatarUrl;
      img.onload = () => {
        avatarImgRef.current = img;
      };
    }
  }, [doctorAvatarUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let frameCount = 0;

    const lerp = (start: number, end: number, amt: number) => start + (end - start) * amt;

    const renderFrame = () => {
      animId = requestAnimationFrame(renderFrame);
      frameCount++;

      const w = canvas.width;
      const h = canvas.height;
      const j = currentJoints.current;

      // Clear Canvas
      ctx.clearRect(0, 0, w, h);

      // Target pose positions calculation
      let targetBodyX = 180;
      let targetBodyY = 160;
      let targetHeadAngle = 0;
      let targetRightHandX = 170;
      let targetRightHandY = 240;
      let targetLeftHandX = 130;
      let targetLeftHandY = 240;

      // Breathing motion
      const breathOffset = Math.sin(frameCount * 0.05) * 2;
      targetBodyY += breathOffset;

      // Blink timing
      if (frameCount % 180 < 10) {
        j.eyeBlink = lerp(j.eyeBlink, 1, 0.3);
      } else {
        j.eyeBlink = lerp(j.eyeBlink, 0, 0.2);
      }

      // Pose Kinematics
      switch (pose) {
        case 'PRESENTING':
          targetBodyX = 170;
          targetRightHandX = 210 + Math.sin(frameCount * 0.1) * 10;
          targetRightHandY = 220 + Math.cos(frameCount * 0.1) * 8;
          targetLeftHandX = 120 - Math.sin(frameCount * 0.1) * 10;
          targetLeftHandY = 220;
          targetHeadAngle = Math.sin(frameCount * 0.05) * 0.04;
          break;

        case 'WALKING_TO_BOARD':
          targetBodyX = 80 + Math.sin(frameCount * 0.15) * 15;
          targetRightHandX = targetBodyX + 30;
          targetRightHandY = 230;
          targetLeftHandX = targetBodyX - 30;
          targetLeftHandY = 230;
          break;

        case 'WRITING_FORMULA':
        case 'DRAWING_CIRCUIT':
          targetBodyX = 70; // Doctor stands close to left side of whiteboard
          // Map handTargetX/Y (0-500) to Canvas stage coordinates
          targetRightHandX = 60 + (handTargetX / 500) * 140;
          targetRightHandY = 60 + (handTargetY / 400) * 200;
          targetLeftHandX = 40;
          targetLeftHandY = 240;
          targetHeadAngle = -0.1; // Looking at board
          j.penGlow = 1;
          break;

        case 'POINTING_GESTURE':
          targetBodyX = 150;
          targetRightHandX = 60 + (handTargetX / 500) * 120;
          targetRightHandY = 60 + (handTargetY / 400) * 180;
          targetLeftHandX = 120;
          targetLeftHandY = 250;
          targetHeadAngle = 0.08; // Looking back at student
          j.laserDotX = targetRightHandX;
          j.laserDotY = targetRightHandY;
          break;

        case 'PAUSE_LISTEN':
          targetBodyX = 180;
          targetRightHandX = 180;
          targetRightHandY = 230;
          targetLeftHandX = 150;
          targetLeftHandY = 230;
          targetHeadAngle = 0.05;
          break;
      }

      // LERP smooth kinematic transitions
      const lerpSpeed = lowResourceMode ? 0.2 : 0.12;
      j.bodyX = lerp(j.bodyX, targetBodyX, lerpSpeed);
      j.bodyY = lerp(j.bodyY, targetBodyY, lerpSpeed);
      j.headAngle = lerp(j.headAngle, targetHeadAngle, lerpSpeed);
      j.rightHandX = lerp(j.rightHandX, targetRightHandX, lerpSpeed);
      j.rightHandY = lerp(j.rightHandY, targetRightHandY, lerpSpeed);
      j.leftHandX = lerp(j.leftHandX, targetLeftHandX, lerpSpeed);
      j.leftHandY = lerp(j.leftHandY, targetLeftHandY, lerpSpeed);

      // --- RENDER CHARACTER SKELETON & MESH ---

      ctx.save();
      ctx.translate(j.bodyX, j.bodyY);

      // 1. Shadow Grounding
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(0, 160, 45, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Legs & Lower Torso
      ctx.fillStyle = '#0f172a'; // Dark trousers
      ctx.fillRect(-22, 90, 18, 70);
      ctx.fillRect(4, 90, 18, 70);

      // Shoes
      ctx.fillStyle = '#020617';
      ctx.fillRect(-26, 155, 24, 10);
      ctx.fillRect(4, 155, 24, 10);

      // 3. Lab Coat & Torso (Professional Doctor Suit)
      ctx.fillStyle = '#f8fafc'; // White lab coat
      ctx.beginPath();
      ctx.roundRect(-35, 10, 70, 90, [12, 12, 4, 4]);
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Shirt & Tie inside coat
      ctx.fillStyle = '#0f172a'; // Dark shirt
      ctx.fillRect(-10, 10, 20, 45);

      ctx.fillStyle = '#dc2626'; // Red necktie
      ctx.beginPath();
      ctx.moveTo(-4, 15);
      ctx.lineTo(4, 15);
      ctx.lineTo(6, 45);
      ctx.lineTo(0, 52);
      ctx.lineTo(-6, 45);
      ctx.closePath();
      ctx.fill();

      // Doctor Badge "R" on Lab Coat
      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(-28, 25, 14, 18);
      ctx.fillStyle = '#0b2545';
      ctx.font = 'bold 11px JetBrains Mono';
      ctx.fillText('R', -24, 39);

      // 4. Arms Kinematics
      ctx.restore(); // Restore to absolute canvas space for arm reaching

      // Left Arm
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(j.bodyX - 28, j.bodyY + 25);
      ctx.lineTo(j.leftHandX, j.leftHandY);
      ctx.stroke();

      // Left Hand
      ctx.fillStyle = '#fbcfe8'; // Skin tone
      ctx.beginPath();
      ctx.arc(j.leftHandX, j.leftHandY, 8, 0, Math.PI * 2);
      ctx.fill();

      // Right Arm (Writing/Pointing Arm)
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(j.bodyX + 28, j.bodyY + 25);
      ctx.lineTo(j.rightHandX, j.rightHandY);
      ctx.stroke();

      // Right Hand holding glowing Electronic Stylus Pen
      ctx.fillStyle = '#fbcfe8';
      ctx.beginPath();
      ctx.arc(j.rightHandX, j.rightHandY, 9, 0, Math.PI * 2);
      ctx.fill();

      // Stylus Pen
      ctx.save();
      ctx.translate(j.rightHandX, j.rightHandY);
      ctx.rotate(-Math.PI / 4);
      ctx.fillStyle = '#334155';
      ctx.fillRect(-3, -15, 6, 22);

      // Glowing Pen Tip
      ctx.fillStyle = '#00f0ff';
      ctx.beginPath();
      ctx.arc(0, -16, 4, 0, Math.PI * 2);
      ctx.fill();

      if (pose === 'WRITING_FORMULA' || pose === 'DRAWING_CIRCUIT') {
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(0, -16, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Laser Pointer Dot if pointing
      if (pose === 'POINTING_GESTURE') {
        ctx.save();
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(j.rightHandX - 15, j.rightHandY - 20, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 5. Head & Facial Features
      ctx.save();
      ctx.translate(j.bodyX, j.bodyY);
      ctx.rotate(j.headAngle);

      // Head shape or Image Avatar overlay
      if (avatarImgRef.current) {
        // Clip doctor head in smooth circular academic avatar frame
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, -35, 34, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(avatarImgRef.current, -34, -69, 68, 68);
        ctx.restore();

        // Golden frame ring matching official logo
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, -35, 34, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // Fallback Vector Head
        ctx.fillStyle = '#fbcfe8'; // Skin tone
        ctx.beginPath();
        ctx.arc(0, -35, 30, 0, Math.PI * 2);
        ctx.fill();

        // Hair
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(0, -42, 31, Math.PI, 0);
        ctx.fill();

        // Glasses
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(-20, -42, 16, 12);
        ctx.strokeRect(4, -42, 16, 12);
        ctx.beginPath();
        ctx.moveTo(-4, -36);
        ctx.lineTo(4, -36);
        ctx.stroke();

        // Eyes with blinking
        if (j.eyeBlink < 0.5) {
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(-12, -36, 3, 0, Math.PI * 2);
          ctx.arc(12, -36, 3, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-16, -36);
          ctx.lineTo(-8, -36);
          ctx.moveTo(8, -36);
          ctx.lineTo(16, -36);
          ctx.stroke();
        }
      }

      // 6. Dynamic Lip-Sync Mouth Mesh
      ctx.save();
      ctx.translate(0, -18);

      const mOpen = viseme.mouthOpen * 14;
      ctx.fillStyle = '#991b1b';
      ctx.strokeStyle = '#450a0a';
      ctx.lineWidth = 2;

      ctx.beginPath();
      if (viseme.mouthShape === 'O') {
        ctx.ellipse(0, 0, 6, Math.max(3, mOpen), 0, 0, Math.PI * 2);
      } else if (viseme.mouthShape === 'A') {
        ctx.ellipse(0, 0, 9, Math.max(4, mOpen), 0, 0, Math.PI * 2);
      } else if (viseme.mouthShape === 'E') {
        ctx.ellipse(0, 0, 11, Math.max(2, mOpen * 0.6), 0, 0, Math.PI * 2);
      } else if (viseme.mouthShape === 'M') {
        ctx.rect(-8, -1, 16, 2);
      } else {
        // Neutral / S
        ctx.ellipse(0, 0, 7, Math.max(2, mOpen * 0.4), 0, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.stroke();

      ctx.restore();

      ctx.restore();
    };

    renderFrame();

    return () => cancelAnimationFrame(animId);
  }, [pose, viseme, handTargetX, handTargetY, isSpeaking, lowResourceMode]);

  return (
    <div className="relative w-full h-[400px] flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={340}
        height={400}
        className="w-auto h-full block pointer-events-none"
      />

      {/* Doctor Name Tag Badge */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md border border-amber-500/30 px-3 py-1 rounded-full text-[10px] font-bold text-amber-300 shadow-md">
        👨‍🏫 {doctorName}
      </div>
    </div>
  );
};
