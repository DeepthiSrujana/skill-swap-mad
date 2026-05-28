import 'package:flutter/material.dart';
import '../services/firebase_service.dart';
import '../models/session_model.dart';
import 'schedule_session_screen.dart';
import 'video_call_screen.dart';

class SessionsScreen extends StatefulWidget {
  const SessionsScreen({super.key});

  @override
  State<SessionsScreen> createState() => _SessionsScreenState();
}

class _SessionsScreenState extends State<SessionsScreen> with SingleTickerProviderStateMixin {
  final _service = FirebaseService();
  late TabController _tabController;
  
  List<SessionModel> _sessions = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadSessions();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _loadSessions() async {
    setState(() => _isLoading = true);
    final data = await _service.getSessions();
    setState(() {
      _sessions = data;
      _isLoading = false;
    });
  }

  void _acceptSwap(SessionModel session) async {
    final success = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ScheduleSessionScreen(
          sessionId: session.id,
          partnerName: session.partnerName,
          sessionTitle: session.title,
        ),
      ),
    );
    if (success == true) {
      _loadSessions();
    }
  }

  void _declineOrCancelSwap(String sessionId) async {
    await _service.updateSessionStatus(sessionId, 'cancelled', isDone: true);
    _loadSessions();
  }

  void _joinCallRoom(SessionModel session) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => VideoCallScreen(
          sessionId: session.id,
          partnerId: session.partnerId,
          partnerName: session.partnerName,
          sessionTitle: session.title,
        ),
      ),
    ).then((_) => _loadSessions()); // Reload list when call finishes
  }

  @override
  Widget build(BuildContext context) {
    final pending = _sessions.where((s) => s.status == 'pending' && !s.isDone).toList();
    final upcoming = _sessions.where((s) => s.status == 'accepted' && !s.isDone).toList();
    final completed = _sessions.where((s) => s.status == 'completed' || s.isDone).toList();

    return Scaffold(
      backgroundColor: const Color(0xFF0F0E17),
      appBar: AppBar(
        backgroundColor: const Color(0xFF161426),
        title: const Text(
          "Your Sessions",
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 18),
        ),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: const Color(0xFF6366F1),
          labelColor: const Color(0xFF6366F1),
          unselectedLabelColor: Colors.white.withOpacity(0.4),
          labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
          tabs: const [
            Tab(text: "Pending"),
            Tab(text: "Upcoming"),
            Tab(text: "Completed"),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF6366F1)))
          : TabBarView(
              controller: _tabController,
              children: [
                _buildSessionList(pending, isPending: true),
                _buildSessionList(upcoming, isUpcoming: true),
                _buildSessionList(completed, isCompleted: true),
              ],
            ),
    );
  }

  Widget _buildSessionList(List<SessionModel> list, {bool isPending = false, bool isUpcoming = false, bool isCompleted = false}) {
    if (list.isEmpty) {
      return Center(
        child: Text(
          "No sessions in this category.",
          style: TextStyle(color: Colors.white.withOpacity(0.3), fontSize: 13),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(20),
      itemCount: list.length,
      itemBuilder: (ctx, idx) {
        final session = list[idx];
        return Card(
          color: const Color(0xFF161426),
          margin: const EdgeInsets.only(bottom: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: BorderSide(color: Colors.white.withOpacity(0.04)),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        session.title,
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 15),
                      ),
                    ),
                    _buildStatusBadge(session),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  "With ${session.partnerName}",
                  style: TextStyle(color: Colors.white.withOpacity(0.4), fontSize: 13),
                ),
                const SizedBox(height: 12),
                const Divider(color: Colors.white10),
                const SizedBox(height: 6),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.calendar_today, color: Colors.white.withOpacity(0.3), size: 16),
                        const SizedBox(width: 6),
                        Text(
                          isPending ? "Pending Time Confirmation" : "${session.date} @ ${session.time} (${session.duration})",
                          style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 12),
                        ),
                      ],
                    ),
                    if (isPending) ...[
                      session.isInbound
                          ? Row(
                              children: [
                                GestureDetector(
                                  onTap: () => _declineOrCancelSwap(session.id),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                    decoration: BoxDecoration(
                                      border: Border.all(color: const Color(0xFFEF4444).withOpacity(0.4)),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: const Text("Decline", style: TextStyle(color: Color(0xFFEF4444), fontSize: 11, fontWeight: FontWeight.w700)),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                ElevatedButton(
                                  onPressed: () => _acceptSwap(session),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF10B981),
                                    foregroundColor: Colors.black,
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                    elevation: 0,
                                  ),
                                  child: const Text("Accept Swap", style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900)),
                                ),
                              ],
                            )
                          : GestureDetector(
                              onTap: () => _declineOrCancelSwap(session.id),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFEF4444).withOpacity(0.1),
                                  border: Border.all(color: const Color(0xFFEF4444).withOpacity(0.3)),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: const Text("Cancel Request", style: TextStyle(color: Color(0xFFEF4444), fontSize: 11, fontWeight: FontWeight.w700)),
                              ),
                            ),
                    ] else if (isUpcoming) ...[
                      ElevatedButton.icon(
                        onPressed: () => _joinCallRoom(session),
                        icon: const Icon(Icons.video_call, size: 16, color: Colors.white),
                        label: const Text("Join Room", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF6366F1),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        ),
                      ),
                    ] else if (isCompleted) ...[
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.04),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Text("Session Logged", style: TextStyle(color: Colors.white54, fontSize: 11, fontWeight: FontWeight.w600)),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildStatusBadge(SessionModel session) {
    String text = "";
    Color color = Colors.white;
    Color bg = Colors.transparent;

    if (session.status == 'pending') {
      text = session.isInbound ? "INBOUND" : "SENT";
      color = session.isInbound ? const Color(0xFFF59E0B) : const Color(0xFF3B82F6);
      bg = color.withOpacity(0.12);
    } else if (session.status == 'accepted') {
      text = "UPCOMING";
      color = const Color(0xFF10B981);
      bg = color.withOpacity(0.12);
    } else {
      text = "COMPLETED";
      color = Colors.white.withOpacity(0.3);
      bg = Colors.white.withOpacity(0.04);
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        text,
        style: TextStyle(color: color, fontSize: 9, fontWeight: FontWeight.w900, letterSpacing: 0.5),
      ),
    );
  }
}
