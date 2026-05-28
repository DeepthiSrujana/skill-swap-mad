import 'package:flutter/material.dart';
import '../services/firebase_service.dart';
import '../models/user_model.dart';
import '../models/session_model.dart';

class DiscoverScreen extends StatefulWidget {
  const DiscoverScreen({super.key});

  @override
  State<DiscoverScreen> createState() => _DiscoverScreenState();
}

class _DiscoverScreenState extends State<DiscoverScreen> {
  final _service = FirebaseService();
  List<UserModel> _swappers = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadSwappers();
  }

  void _loadSwappers() async {
    setState(() => _isLoading = true);
    final users = await _service.getDiscoverUsers();
    
    // Sort discover matches based on teachers/wants overlaps
    final currentUserId = _service.getCurrentUserId() ?? '';
    final currentUser = await _service.getUser(currentUserId);
    
    if (currentUser != null) {
      users.sort((a, b) {
        final scoreA = _calculateMatchScore(currentUser, a);
        final scoreB = _calculateMatchScore(currentUser, b);
        return scoreB.compareTo(scoreA); // descending
      });
    }
    
    setState(() {
      _swappers = users;
      _isLoading = false;
    });
  }

  int _calculateMatchScore(UserModel active, UserModel target) {
    int points = 80;
    
    // Check if target teaches what active wants to learn
    for (var teach in target.teaches) {
      if (active.wants.any((w) => w.toLowerCase().trim() == teach.toLowerCase().trim())) {
        points += 10;
        break;
      }
    }
    
    // Check if active teaches what target wants to learn
    for (var teach in active.teaches) {
      if (target.wants.any((w) => w.toLowerCase().trim() == teach.toLowerCase().trim())) {
        points += 8;
        break;
      }
    }

    return points > 99 ? 99 : points;
  }

  void _requestSwap(UserModel partner) async {
    final currentUserId = _service.getCurrentUserId() ?? 'user_1';
    final currentUser = await _service.getUser(currentUserId);
    if (currentUser == null) return;

    final sessionId = "sess_group_${DateTime.now().millisecondsSinceEpoch}";
    
    // Create dual session documents for Firestore sync (requester and target)
    final teachesSkill = partner.teaches.isNotEmpty ? partner.teaches.first : "General Skills";
    
    final reqSession = SessionModel(
      id: "${sessionId}_req",
      groupId: sessionId,
      userId: currentUserId,
      partnerId: partner.id,
      partnerName: partner.name,
      title: "$teachesSkill with ${partner.name}",
      date: "Scheduled (Pending Confirmation)",
      time: "Pending",
      duration: "60 mins",
      sessionCount: 1,
      status: "pending",
      isInbound: false,
    );

    final tgtSession = SessionModel(
      id: "${sessionId}_tgt",
      groupId: sessionId,
      userId: partner.id,
      partnerId: currentUserId,
      partnerName: currentUser.name,
      title: "$teachesSkill with ${currentUser.name}",
      date: "Pending Inbound Request",
      time: "Pending",
      duration: "60 mins",
      sessionCount: 1,
      status: "pending",
      isInbound: true,
    );

    await _service.createSession(reqSession);
    await _service.createSession(tgtSession);

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text("Swap request successfully sent to ${partner.name}!"),
        backgroundColor: const Color(0xFF6366F1),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F0E17),
      appBar: AppBar(
        backgroundColor: const Color(0xFF161426),
        title: const Text(
          "Discover Partners",
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 18),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white),
            onPressed: _loadSwappers,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF6366F1)))
          : _swappers.isEmpty
              ? Center(
                  child: Text(
                    "No partners found nearby",
                    style: TextStyle(color: Colors.white.withOpacity(0.4)),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _swappers.length,
                  itemBuilder: (ctx, idx) {
                    final swapper = _swappers[idx];
                    final currentUserId = _service.getCurrentUserId() ?? '';
                    
                    // Simple mock profile match calculation
                    int matchPct = 85;
                    _service.getUser(currentUserId).then((currentUser) {
                      if (currentUser != null && mounted) {
                        setState(() {
                          matchPct = _calculateMatchScore(currentUser, swapper);
                        });
                      }
                    });

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
                                Row(
                                  children: [
                                    CircleAvatar(
                                      backgroundColor: const Color(0xFF6366F1),
                                      child: Text(
                                        swapper.name[0].toUpperCase(),
                                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          swapper.name,
                                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 15),
                                        ),
                                        Text(
                                          swapper.title,
                                          style: TextStyle(color: Colors.white.withOpacity(0.4), fontSize: 12),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF6366F1).withOpacity(0.15),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    "$matchPct% MATCH",
                                    style: const TextStyle(color: Color(0xFF6366F1), fontSize: 10, fontWeight: FontWeight.w900),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 14),
                            Text(
                              swapper.bio,
                              style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 13, height: 1.4),
                            ),
                            const SizedBox(height: 14),
                            const Divider(color: Colors.white10),
                            const SizedBox(height: 6),
                            _buildSkillRow("Teaches", swapper.teaches.join(", "), const Color(0xFF10B981)),
                            const SizedBox(height: 8),
                            _buildSkillRow("Wants to Learn", swapper.wants.join(", "), const Color(0xFF6366F1)),
                            const SizedBox(height: 16),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  children: [
                                    const Icon(Icons.star, color: Color(0xFFF59E0B), size: 16),
                                    const SizedBox(width: 4),
                                    Text(
                                      swapper.ratingValue,
                                      style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w800),
                                    ),
                                    const SizedBox(width: 12),
                                    Icon(Icons.sync_alt, color: Colors.white.withOpacity(0.3), size: 16),
                                    const SizedBox(width: 4),
                                    Text(
                                      "${swapper.swapsCount} Swaps",
                                      style: TextStyle(color: Colors.white.withOpacity(0.4), fontSize: 12),
                                    ),
                                  ],
                                ),
                                ElevatedButton(
                                  onPressed: () => _requestSwap(swapper),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF6366F1),
                                    foregroundColor: Colors.white,
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                  ),
                                  child: const Text("Request Swap", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }

  Widget _buildSkillRow(String label, String skills, Color badgeColor) {
    return Row(
      children: [
        SizedBox(
          width: 90,
          child: Text(
            "$label:",
            style: TextStyle(color: Colors.white.withOpacity(0.3), fontSize: 12, fontWeight: FontWeight.w600),
          ),
        ),
        Expanded(
          child: Text(
            skills.isEmpty ? "General / Academics" : skills,
            style: TextStyle(color: badgeColor, fontSize: 12, fontWeight: FontWeight.w700),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}
