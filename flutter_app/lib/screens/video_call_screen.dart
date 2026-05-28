import 'dart:async';
import 'package:flutter/material.dart';
import 'package:agora_rtc_engine/agora_rtc_engine.dart';
import '../services/firebase_service.dart';

class VideoCallScreen extends StatefulWidget {
  final String sessionId;
  final String partnerId;
  final String partnerName;
  final String sessionTitle;

  const VideoCallScreen({
    super.key,
    required this.sessionId,
    required this.partnerId,
    required this.partnerName,
    required this.sessionTitle,
  });

  @override
  State<VideoCallScreen> createState() => _VideoCallScreenState();
}

class _VideoCallScreenState extends State<VideoCallScreen> {
  final _service = FirebaseService();
  
  // Agora RTC variables
  RtcEngine? _engine;
  bool _isJoined = false;
  int? _remoteUid;
  bool _muted = false;
  bool _cameraDisabled = false;

  // Constants
  static const String _agoraAppId = "YOUR_AGORA_APP_ID"; // Replace with your real Agora AppId
  static const String _channelName = "skillswap_channel";

  // Simulation fallback variables
  bool _useSimulation = true;
  int _callDurationSeconds = 0;
  Timer? _durationTimer;

  @override
  void initState() {
    super.initState();
    _initializeCalling();
  }

  @override
  void dispose() {
    _durationTimer?.cancel();
    _disposeAgora();
    super.dispose();
  }

  Future<void> _disposeAgora() async {
    if (_engine != null) {
      await _engine!.leaveChannel();
      await _engine!.release();
    }
  }

  void _initializeCalling() async {
    if (_agoraAppId != "YOUR_AGORA_APP_ID" && _agoraAppId.isNotEmpty) {
      setState(() => _useSimulation = false);
      try {
        // Initialize Agora SDK Engine
        _engine = createAgoraRtcEngine();
        await _engine!.initialize(const RtcEngineContext(
          appId: _agoraAppId,
          channelProfile: ChannelProfileType.channelProfileLiveBroadcasting,
        ));
        
        _engine!.registerEventHandler(
          RtcEngineEventHandler(
            onJoinChannelSuccess: (RtcConnection connection, int elapsed) {
              setState(() => _isJoined = true);
            },
            onUserJoined: (RtcConnection connection, int remoteUid, int elapsed) {
              setState(() => _remoteUid = remoteUid);
            },
            onUserOffline: (RtcConnection connection, int remoteUid, UserOfflineReasonType reason) {
              setState(() => _remoteUid = null);
            },
          ),
        );

        await _engine!.enableVideo();
        await _engine!.startPreview();
        await _engine!.joinChannel(
          token: "", // Paste your Agora RTC Token if generated
          channelId: _channelName,
          uid: 0,
          options: const ChannelMediaOptions(),
        );
      } catch (e) {
        // Agora setup failed or not configured, fallback to high fidelity simulation mode
        setState(() => _useSimulation = true);
        _startSimulationTimer();
      }
    } else {
      // No valid AppID, load simulation engine directly
      _startSimulationTimer();
    }
  }

  void _startSimulationTimer() {
    _durationTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (mounted) {
        setState(() {
          _callDurationSeconds++;
        });
      }
    });
  }

  String _formatDuration(int seconds) {
    final mins = (seconds ~/ 60).toString().padLeft(2, '0');
    final secs = (seconds % 60).toString().padLeft(2, '0');
    return "$mins:$secs";
  }

  void _endCall() async {
    _durationTimer?.cancel();
    await _disposeAgora();

    // 1. Move session to Completed in Firestore
    await _service.updateSessionStatus(widget.sessionId, 'completed', isDone: true);

    // 2. Open Star Rating sheet modal immediately
    _showRatingModal();
  }

  void _showRatingModal() {
    int selectedStars = 5;
    bool isSaving = false;

    showModalBottomSheet(
      context: context,
      isDismissible: false,
      enableDrag: false,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Container(
              decoration: const BoxDecoration(
                color: Color(0xFF161426),
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
                boxShadow: [BoxShadow(color: Colors.black54, blurRadius: 40, spreadRadius: 10)],
              ),
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text(
                    "Rate Your Partner",
                    style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    "How was your learning exchange with ${widget.partnerName}?",
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 12),
                  ),
                  const SizedBox(height: 24),
                  
                  // Interactive Star Selector (1 to 5 stars)
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(5, (idx) {
                      final starVal = idx + 1;
                      final isSelected = starVal <= selectedStars;
                      return GestureDetector(
                        onTap: () {
                          setModalState(() {
                            selectedStars = starVal;
                          });
                        },
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 6),
                          child: Icon(
                            Icons.star,
                            size: 38,
                            color: isSelected ? const Color(0xFFF59E0B) : Colors.white.withOpacity(0.12),
                          ),
                        ),
                      );
                    }),
                  ),
                  const SizedBox(height: 36),

                  ElevatedButton(
                    onPressed: isSaving
                        ? null
                        : () async {
                            setModalState(() => isSaving = true);
                            
                            // 3. Save ratings review to Firebase Firestore
                            await _service.submitRatingAndReview(
                              widget.partnerId,
                              selectedStars.toDouble(),
                            );
                            
                            if (mounted) {
                              Navigator.pop(ctx); // Close Rating modal
                              Navigator.pop(context); // Exit call screen back to Sessions list
                            }
                          },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF6366F1),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      minimumSize: const Size(double.infinity, 44),
                    ),
                    child: isSaving
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                          )
                        : const Text("Submit Review", style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                  ),
                  const SizedBox(height: 12),
                ],
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF09080E),
      body: Stack(
        children: [
          // Background/Call Area
          _useSimulation ? _buildSimulationView() : _buildAgoraView(),

          // Overlay Control panel (Header & Footer UI buttons)
          SafeArea(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Call Header Info
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.sessionTitle,
                            style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w800),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            "Partner: ${widget.partnerName}",
                            style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 12),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.redAccent.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 6,
                              height: 6,
                              decoration: const BoxDecoration(color: Colors.redAccent, shape: BoxShape.circle),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              _formatDuration(_callDurationSeconds),
                              style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w800),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                // Call Footer Controls
                Padding(
                  padding: const EdgeInsets.only(bottom: 32, left: 24, right: 24),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // Camera Mute
                      _buildControlButton(
                        icon: _cameraDisabled ? Icons.videocam_off : Icons.videocam,
                        color: _cameraDisabled ? Colors.redAccent.withOpacity(0.15) : Colors.white.withOpacity(0.06),
                        iconColor: _cameraDisabled ? Colors.redAccent : Colors.white,
                        onTap: () {
                          setState(() {
                            _cameraDisabled = !_cameraDisabled;
                          });
                          _engine?.muteLocalVideoStream(_cameraDisabled);
                        },
                      ),
                      const SizedBox(width: 20),

                      // Red End Call Button
                      GestureDetector(
                        onTap: _endCall,
                        child: Container(
                          height: 56,
                          width: 56,
                          decoration: const BoxDecoration(
                            color: Colors.redAccent,
                            shape: BoxShape.circle,
                            boxShadow: [BoxShadow(color: Colors.redAccent, blurRadius: 16, spreadRadius: 1)],
                          ),
                          child: const Icon(Icons.call_end, color: Colors.white, size: 24),
                        ),
                      ),
                      const SizedBox(width: 20),

                      // Mic Mute
                      _buildControlButton(
                        icon: _muted ? Icons.mic_off : Icons.mic,
                        color: _muted ? Colors.redAccent.withOpacity(0.15) : Colors.white.withOpacity(0.06),
                        iconColor: _muted ? Colors.redAccent : Colors.white,
                        onTap: () {
                          setState(() {
                            _muted = !_muted;
                          });
                          _engine?.muteLocalAudioStream(_muted);
                        },
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildControlButton({required IconData icon, required Color color, required Color iconColor, required VoidCallback onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 48,
        width: 48,
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white.withOpacity(0.06)),
        ),
        child: Icon(icon, color: iconColor, size: 20),
      ),
    );
  }

  Widget _buildSimulationView() {
    return Stack(
      children: [
        // Simulated remote user viewport background
        Container(
          decoration: const BoxDecoration(
            gradient: RadialGradient(
              colors: [Color(0xFF1E1A3C), Color(0xFF09080E)],
              radius: 1.2,
            ),
          ),
          child: Center(
            child: _cameraDisabled
                ? Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      CircleAvatar(
                        radius: 54,
                        backgroundColor: const Color(0xFF6366F1),
                        child: Text(
                          widget.partnerName[0].toUpperCase(),
                          style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        "${widget.partnerName}'s video is disabled",
                        style: TextStyle(color: Colors.white.withOpacity(0.3), fontSize: 13),
                      ),
                    ],
                  )
                : Image.network(
                    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=600",
                    height: double.infinity,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (ctx, err, stack) {
                      return CircleAvatar(
                        radius: 54,
                        backgroundColor: const Color(0xFF6366F1),
                        child: Text(
                          widget.partnerName[0].toUpperCase(),
                          style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold),
                        ),
                      );
                    },
                  ),
          ),
        ),

        // Simulated local user camera PIP preview (bottom right)
        Positioned(
          bottom: 110,
          right: 20,
          child: Container(
            width: 100,
            height: 150,
            decoration: BoxDecoration(
              color: const Color(0xFF161426),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.white.withOpacity(0.08)),
              boxShadow: const [BoxShadow(color: Colors.black38, blurRadius: 10)],
            ),
            overflow: BoxOverflow.hidden,
            child: _cameraDisabled
                ? const Center(child: Icon(Icons.videocam_off, color: Colors.white30))
                : Image.network(
                    "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=300",
                    fit: BoxFit.cover,
                    errorBuilder: (ctx, err, stack) => const Center(child: Icon(Icons.person, color: Colors.white30)),
                  ),
          ),
        ),
      ],
    );
  }

  Widget _buildAgoraView() {
    return Stack(
      children: [
        // Remote View
        Center(
          child: _remoteUid != null
              ? AgoraVideoView(
                  controller: VideoViewController.remote(
                    rtcEngine: _engine!,
                    canvas: VideoCanvas(uid: _remoteUid),
                    connection: const RtcConnection(channelId: _channelName),
                  ),
                )
              : Text(
                  'Waiting for ${widget.partnerName} to join...',
                  style: TextStyle(color: Colors.white.withOpacity(0.4), fontSize: 13),
                ),
        ),
        
        // Local PIP View
        Positioned(
          bottom: 110,
          right: 20,
          child: SizedBox(
            width: 100,
            height: 150,
            child: _isJoined
                ? AgoraVideoView(
                    controller: VideoViewController(
                      rtcEngine: _engine!,
                      canvas: const VideoCanvas(uid: 0),
                    ),
                  )
                : const CircularProgressIndicator(),
          ),
        ),
      ],
    );
  }
}
