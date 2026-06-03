import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface RemotePeer {
  userId: string;
  displayName: string;
  isTeacher: boolean;
  stream: MediaStream | null;
  micOn: boolean;
  camOn: boolean;
  sharing: boolean;
  handRaised?: boolean;
}

export interface ChatMsg {
  id: string;
  userId: string;
  name: string;
  text: string;
  ts: number;
}

export interface WhiteboardStroke {
  id: string;
  color: string;
  width: number;
  points: { x: number; y: number }[];
  erase?: boolean;
}

interface UseClassRoomOpts {
  classId: string;
  userId: string;
  displayName: string;
  isTeacher: boolean;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export function useClassRoom({ classId, userId, displayName, isTeacher }: UseClassRoomOpts) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<Record<string, RemotePeer>>({});
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [strokes, setStrokes] = useState<WhiteboardStroke[]>([]);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  // Permissions: keyed by userId. Teachers always implicitly allowed.
  const [drawPerms, setDrawPerms] = useState<Record<string, boolean>>({});
  const [sharePerms, setSharePerms] = useState<Record<string, boolean>>({});
  const [handRaised, setHandRaised] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const pcsRef = useRef<Record<string, RTCPeerConnection>>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerMetaRef = useRef<Record<string, { displayName: string; isTeacher: boolean }>>({});
  const strokesRef = useRef<WhiteboardStroke[]>([]);
  const drawPermsRef = useRef<Record<string, boolean>>({});
  const sharePermsRef = useRef<Record<string, boolean>>({});
  const isTeacherRef = useRef(isTeacher);
  const screenAudioSendersRef = useRef<Record<string, RTCRtpSender>>({});
  const peerStreamsRef = useRef<Record<string, MediaStream>>({});
  useEffect(() => { isTeacherRef.current = isTeacher; }, [isTeacher]);
  useEffect(() => { strokesRef.current = strokes; }, [strokes]);
  useEffect(() => { drawPermsRef.current = drawPerms; }, [drawPerms]);
  useEffect(() => { sharePermsRef.current = sharePerms; }, [sharePerms]);

  // Initialize media. Students default with camera OFF (mesh-friendly for larger classes).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: { width: { ideal: 640 }, height: { ideal: 480 } },
        });
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        // Students join camera-off and mic-off to keep mesh bandwidth low (works for ~30-40 peers).
        if (!isTeacherRef.current) {
          stream.getVideoTracks().forEach(t => { t.enabled = false; });
          stream.getAudioTracks().forEach(t => { t.enabled = false; });
          setCamOn(false);
          setMicOn(false);
        }
        localStreamRef.current = stream;
        setLocalStream(stream);
      } catch (e) {
        console.error('getUserMedia', e);
        setMediaError('دسترسی به دوربین/میکروفون رد شد. لطفا اجازه دهید و دوباره وارد شوید.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Helpers
  const send = useCallback((event: string, payload: Record<string, unknown>) => {
    channelRef.current?.send({ type: 'broadcast', event, payload: { ...payload, from: userId } });
  }, [userId]);

  const setPeerState = useCallback((peerId: string, patch: Partial<RemotePeer>) => {
    setPeers(prev => {
      const meta = peerMetaRef.current[peerId] || { displayName: 'کاربر', isTeacher: false };
      const existing = prev[peerId] || { userId: peerId, displayName: meta.displayName, isTeacher: meta.isTeacher, stream: null, micOn: true, camOn: true, sharing: false };
      return { ...prev, [peerId]: { ...existing, ...patch } };
    });
  }, []);

  const removePeer = useCallback((peerId: string) => {
    pcsRef.current[peerId]?.close();
    delete pcsRef.current[peerId];
    delete peerMetaRef.current[peerId];
    delete peerStreamsRef.current[peerId];
    delete screenAudioSendersRef.current[peerId];
    setPeers(prev => {
      const next = { ...prev };
      delete next[peerId];
      return next;
    });
  }, []);

  const createPeerConnection = useCallback((peerId: string): RTCPeerConnection => {
    const existing = pcsRef.current[peerId];
    if (existing) return existing;
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcsRef.current[peerId] = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        send('ice', { to: peerId, candidate: e.candidate.toJSON() });
      }
    };
    pc.ontrack = (e) => {
      // Accumulate tracks into one MediaStream per peer so adding screen audio
      // doesn't wipe out the existing camera/mic stream.
      let agg = peerStreamsRef.current[peerId];
      if (!agg) {
        agg = new MediaStream();
        peerStreamsRef.current[peerId] = agg;
      }
      if (!agg.getTracks().some(t => t.id === e.track.id)) {
        agg.addTrack(e.track);
      }
      e.track.onended = () => {
        try { agg.removeTrack(e.track); } catch { /* noop */ }
        setPeerState(peerId, { stream: new MediaStream(agg.getTracks()) });
      };
      setPeerState(peerId, { stream: new MediaStream(agg.getTracks()) });
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        // keep peer; presence will remove if gone
      }
    };

    const local = localStreamRef.current;
    if (local) {
      local.getTracks().forEach(t => pc.addTrack(t, local));
    }
    return pc;
  }, [send, setPeerState]);

  // Replace outgoing video track (camera <-> screen)
  const replaceVideoTrack = useCallback((newTrack: MediaStreamTrack | null) => {
    Object.values(pcsRef.current).forEach(pc => {
      const sender = pc.getSenders().find(s => s.track?.kind === 'video');
      if (sender) sender.replaceTrack(newTrack);
    });
  }, []);

  // Force renegotiation with one peer (used when adding/removing extra tracks like screen audio)
  const renegotiate = useCallback(async (peerId: string) => {
    const pc = pcsRef.current[peerId];
    if (!pc) return;
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      send('offer', { to: peerId, sdp: offer });
    } catch (e) { console.error('renegotiate', e); }
  }, [send]);

  // Open Supabase channel + WebRTC mesh after we have local stream
  useEffect(() => {
    if (!localStream) return;

    const channel = supabase.channel(`class:${classId}`, {
      config: {
        presence: { key: userId },
        broadcast: { self: false, ack: false },
      },
    });
    channelRef.current = channel;

    const handleNewPeer = async (peerId: string, meta: { displayName: string; isTeacher: boolean }) => {
      if (peerId === userId) return;
      peerMetaRef.current[peerId] = meta;
      setPeerState(peerId, { displayName: meta.displayName, isTeacher: meta.isTeacher });
      // Deterministic offerer: lexicographically smaller userId offers
      if (userId < peerId) {
        const pc = createPeerConnection(peerId);
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          send('offer', { to: peerId, sdp: offer });
        } catch (e) { console.error('offer error', e); }
      }
    };

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as Record<string, { displayName: string; isTeacher: boolean; user_id: string }[]>;
        const currentIds = new Set<string>();
        for (const key of Object.keys(state)) {
          const entry = state[key][0];
          if (!entry) continue;
          if (key === userId) continue;
          currentIds.add(key);
          if (!peerMetaRef.current[key]) {
            handleNewPeer(key, { displayName: entry.displayName, isTeacher: entry.isTeacher });
          } else {
            setPeerState(key, { displayName: entry.displayName, isTeacher: entry.isTeacher });
          }
        }
        // remove disappeared peers
        Object.keys(pcsRef.current).forEach(pid => {
          if (!currentIds.has(pid)) removePeer(pid);
        });
      })
      .on('broadcast', { event: 'offer' }, async ({ payload }) => {
        const { from, to, sdp } = payload as { from: string; to: string; sdp: RTCSessionDescriptionInit };
        if (to !== userId) return;
        const pc = createPeerConnection(from);
        try {
          await pc.setRemoteDescription(sdp);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          send('answer', { to: from, sdp: answer });
        } catch (e) { console.error('answer error', e); }
      })
      .on('broadcast', { event: 'answer' }, async ({ payload }) => {
        const { from, to, sdp } = payload as { from: string; to: string; sdp: RTCSessionDescriptionInit };
        if (to !== userId) return;
        const pc = pcsRef.current[from];
        if (!pc) return;
        try {
          await pc.setRemoteDescription(sdp);
        } catch (e) { console.error('setRemote answer error', e); }
      })
      .on('broadcast', { event: 'ice' }, async ({ payload }) => {
        const { from, to, candidate } = payload as { from: string; to: string; candidate: RTCIceCandidateInit };
        if (to !== userId) return;
        const pc = pcsRef.current[from];
        if (!pc) return;
        try { await pc.addIceCandidate(candidate); } catch (e) { console.error('addIce', e); }
      })
      .on('broadcast', { event: 'media-state' }, ({ payload }) => {
        const p = payload as { from: string; micOn: boolean; camOn: boolean; sharing: boolean };
        if (p.from === userId) return;
        setPeerState(p.from, { micOn: p.micOn, camOn: p.camOn, sharing: p.sharing });
      })
      .on('broadcast', { event: 'chat' }, ({ payload }) => {
        const m = payload as ChatMsg & { from: string };
        setChat(prev => [...prev, { id: m.id, userId: m.userId, name: m.name, text: m.text, ts: m.ts }]);
      })
      .on('broadcast', { event: 'wb-stroke' }, ({ payload }) => {
        const s = payload as WhiteboardStroke & { from: string };
        if (s.from === userId) return;
        // Only accept strokes from teachers or explicitly granted users
        const allowed = peerMetaRef.current[s.from]?.isTeacher || drawPermsRef.current[s.from];
        if (!allowed) return;
        setStrokes(prev => [...prev, { id: s.id, color: s.color, width: s.width, points: s.points, erase: s.erase }]);
      })
      .on('broadcast', { event: 'wb-clear' }, () => {
        setStrokes([]);
      })
      .on('broadcast', { event: 'wb-sync-request' }, ({ payload }) => {
        const p = payload as { from: string };
        if (!isTeacherRef.current) return;
        if (p.from === userId) return;
        // Teacher answers with full state targeted at requester
        send('wb-sync', { to: p.from, strokes: strokesRef.current });
      })
      .on('broadcast', { event: 'wb-sync' }, ({ payload }) => {
        const p = payload as { to: string; strokes: WhiteboardStroke[]; from: string };
        if (p.to !== userId) return;
        setStrokes(p.strokes || []);
      })
      .on('broadcast', { event: 'perms' }, ({ payload }) => {
        const p = payload as { from: string; draw: Record<string, boolean>; share: Record<string, boolean> };
        // Only honor perms broadcast from teachers
        if (p.from !== userId && !peerMetaRef.current[p.from]?.isTeacher) return;
        setDrawPerms(p.draw || {});
        setSharePerms(p.share || {});
      })
      .on('broadcast', { event: 'hand' }, ({ payload }) => {
        const p = payload as { from: string; raised: boolean };
        if (p.from === userId) return;
        setPeerState(p.from, { handRaised: p.raised });
      })
      .on('broadcast', { event: 'class-ended' }, () => {
        window.dispatchEvent(new CustomEvent('class-ended'));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: userId, displayName, isTeacher });
          setConnected(true);
          // Ask for current whiteboard + perms state from existing teacher(s)
          setTimeout(() => {
            channel.send({ type: 'broadcast', event: 'wb-sync-request', payload: { from: userId } });
          }, 400);
          // If I'm teacher, broadcast current perms so newcomers receive them
          if (isTeacherRef.current) {
            setTimeout(() => {
              channel.send({ type: 'broadcast', event: 'perms', payload: { from: userId, draw: drawPermsRef.current, share: sharePermsRef.current } });
            }, 600);
          }
        }
      });

    return () => {
      Object.values(pcsRef.current).forEach(pc => pc.close());
      pcsRef.current = {};
      peerMetaRef.current = {};
      channel.unsubscribe();
      channelRef.current = null;
      setConnected(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localStream, classId, userId, displayName, isTeacher]);

  // Broadcast media state when toggled
  useEffect(() => {
    if (!connected) return;
    send('media-state', { micOn, camOn, sharing });
  }, [micOn, camOn, sharing, connected, send]);

  // Toggle mic
  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !micOn;
    stream.getAudioTracks().forEach(t => { t.enabled = next; });
    setMicOn(next);
  }, [micOn]);

  // Toggle cam
  const toggleCam = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !camOn;
    stream.getVideoTracks().forEach(t => { t.enabled = next; });
    setCamOn(next);
  }, [camOn]);

  // Screen share
  const startScreenShare = useCallback(async () => {
    if (!isTeacherRef.current && !sharePermsRef.current[userId]) {
      console.warn('screen share denied');
      return;
    }
    try {
      const s = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30 } },
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      screenStreamRef.current = s;
      setScreenStream(s);
      const videoTrack = s.getVideoTracks()[0];
      replaceVideoTrack(videoTrack);
      // Add screen audio (if user shared a tab/system audio) as an extra sender to every peer.
      const audioTrack = s.getAudioTracks()[0];
      if (audioTrack) {
        Object.entries(pcsRef.current).forEach(([peerId, pc]) => {
          try {
            const sender = pc.addTrack(audioTrack, s);
            screenAudioSendersRef.current[peerId] = sender;
          } catch (e) { console.error('addTrack screen audio', e); }
        });
        Object.keys(pcsRef.current).forEach(pid => renegotiate(pid));
      }
      setSharing(true);
      videoTrack.onended = () => {
        stopScreenShare();
      };
    } catch (e) {
      console.error('screenshare', e);
    }
  }, [replaceVideoTrack, renegotiate, userId]);

  const stopScreenShare = useCallback(() => {
    const s = screenStreamRef.current;
    if (s) s.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;
    setScreenStream(null);
    const camTrack = localStreamRef.current?.getVideoTracks()[0] || null;
    replaceVideoTrack(camTrack);
    // Remove any screen-audio senders we added
    Object.entries(screenAudioSendersRef.current).forEach(([peerId, sender]) => {
      const pc = pcsRef.current[peerId];
      if (pc) {
        try { pc.removeTrack(sender); } catch (e) { /* noop */ }
      }
    });
    const peersToRenegotiate = Object.keys(screenAudioSendersRef.current);
    screenAudioSendersRef.current = {};
    peersToRenegotiate.forEach(pid => renegotiate(pid));
    setSharing(false);
  }, [replaceVideoTrack, renegotiate]);

  const sendChat = useCallback((text: string) => {
    const msg: ChatMsg = { id: crypto.randomUUID(), userId, name: displayName, text, ts: Date.now() };
    setChat(prev => [...prev, msg]);
    send('chat', { ...msg });
  }, [userId, displayName, send]);

  const sendStroke = useCallback((stroke: WhiteboardStroke) => {
    if (!isTeacherRef.current && !drawPermsRef.current[userId]) return;
    setStrokes(prev => [...prev, stroke]);
    send('wb-stroke', { ...stroke });
  }, [send]);

  const clearBoard = useCallback(() => {
    if (!isTeacherRef.current && !drawPermsRef.current[userId]) return;
    setStrokes([]);
    send('wb-clear', {});
  }, [send, userId]);

  // Teacher: toggle a student's draw permission
  const setUserDrawPerm = useCallback((peerId: string, allow: boolean) => {
    if (!isTeacherRef.current) return;
    setDrawPerms(prev => {
      const next = { ...prev, [peerId]: allow };
      send('perms', { draw: next, share: sharePermsRef.current });
      return next;
    });
  }, [send]);

  const setUserSharePerm = useCallback((peerId: string, allow: boolean) => {
    if (!isTeacherRef.current) return;
    setSharePerms(prev => {
      const next = { ...prev, [peerId]: allow };
      send('perms', { draw: drawPermsRef.current, share: next });
      return next;
    });
  }, [send]);

  // Hand raise (any participant)
  const toggleHand = useCallback(() => {
    setHandRaised(prev => {
      const next = !prev;
      send('hand', { raised: next });
      return next;
    });
  }, [send]);

  const announceEnd = useCallback(() => {
    send('class-ended', {});
  }, [send]);

  const cleanup = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    Object.values(pcsRef.current).forEach(pc => pc.close());
    pcsRef.current = {};
    channelRef.current?.unsubscribe();
  }, []);

  return {
    localStream,
    screenStream,
    peers,
    chat,
    strokes,
    micOn,
    camOn,
    sharing,
    connected,
    mediaError,
    drawPerms,
    sharePerms,
    handRaised,
    canDraw: isTeacher || !!drawPerms[userId],
    canShare: isTeacher || !!sharePerms[userId],
    toggleMic,
    toggleCam,
    startScreenShare,
    stopScreenShare,
    sendChat,
    sendStroke,
    clearBoard,
    setUserDrawPerm,
    setUserSharePerm,
    toggleHand,
    announceEnd,
    cleanup,
  };
}