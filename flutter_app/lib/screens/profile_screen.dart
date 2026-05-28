import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/firebase_service.dart';
import '../models/user_model.dart';
import 'onboarding_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _service = FirebaseService();
  UserModel? _user;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  void _loadProfile() async {
    setState(() => _isLoading = true);
    final currentUserId = _service.getCurrentUserId() ?? 'user_1';
    final u = await _service.getUser(currentUserId);
    setState(() {
      _user = u;
      _isLoading = false;
    });
  }

  void _showSettingsMenu() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          decoration: const BoxDecoration(
            color: Color(0xFF161426),
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(
                alignment: Alignment.center,
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              const Text(
                "Settings",
                style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 16),
              
              _buildSettingsTile(
                icon: Icons.shield_outlined,
                title: "Account Settings",
                onTap: () => Navigator.pop(ctx),
              ),
              const SizedBox(height: 8),
              _buildSettingsTile(
                icon: Icons.help_outline,
                title: "Help & Support",
                onTap: () => Navigator.pop(ctx),
              ),
              const SizedBox(height: 8),
              _buildSettingsTile(
                icon: Icons.delete_forever,
                title: "Delete Account",
                iconColor: Colors.redAccent,
                textColor: Colors.redAccent,
                onTap: () {
                  Navigator.pop(ctx);
                  _confirmDeleteAccount();
                },
              ),
              const SizedBox(height: 16),
              const Divider(color: Colors.white10),
              const SizedBox(height: 8),
              
              ElevatedButton.icon(
                onPressed: () => _handleLogout(),
                icon: const Icon(Icons.logout, size: 16),
                label: const Text("Log Out", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFEF4444).withOpacity(0.1),
                  foregroundColor: const Color(0xFFEF4444),
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: BorderSide(color: const Color(0xFFEF4444).withOpacity(0.25)),
                  ),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
              const SizedBox(height: 12),
            ],
          ),
        );
      },
    );
  }

  Widget _buildSettingsTile({
    required IconData icon,
    required String title,
    Color iconColor = const Color(0xFF6366F1),
    Color textColor = Colors.white,
    required VoidCallback onTap,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF0F0E17),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withOpacity(0.02)),
      ),
      child: ListTile(
        leading: Icon(icon, color: iconColor, size: 20),
        title: Text(
          title,
          style: TextStyle(color: textColor, fontSize: 13, fontWeight: FontWeight.w600),
        ),
        trailing: const Icon(Icons.chevron_right, color: Colors.white24, size: 18),
        onTap: onTap,
      ),
    );
  }

  void _confirmDeleteAccount() {
    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          backgroundColor: const Color(0xFF161426),
          title: const Text("Delete Account?", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
          content: const Text(
            "Are you absolutely sure you want to permanently delete your account? This action is irreversible and will wipe all your Firestore details.",
            style: TextStyle(color: Colors.white70, fontSize: 13, height: 1.4),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text("Cancel", style: TextStyle(color: Colors.white54)),
            ),
            ElevatedButton(
              onPressed: () async {
                Navigator.pop(ctx);
                setState(() => _isLoading = true);
                
                final currentUserId = _service.getCurrentUserId() ?? 'user_1';
                
                // 4. Secure Firestore deletion updates
                await _service.deleteUser(currentUserId);
                _service.setCurrentUser(null);
                
                final prefs = await SharedPreferences.getInstance();
                await prefs.remove('skillswap_token');
                
                if (mounted) {
                  Navigator.of(context).pushAndRemoveUntil(
                    MaterialPageRoute(builder: (_) => const OnboardingScreen()),
                    (route) => false,
                  );
                }
              },
              style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent, foregroundColor: Colors.white),
              child: const Text("Delete", style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        );
      },
    );
  }

  void _handleLogout() async {
    _service.setCurrentUser(null);
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('skillswap_token');
    
    if (mounted) {
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const OnboardingScreen()),
        (route) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        backgroundColor: Color(0xFF0F0E17),
        body: Center(child: CircularProgressIndicator(color: Color(0xFF6366F1))),
      );
    }

    final user = _user!;

    return Scaffold(
      backgroundColor: const Color(0xFF0F0E17),
      appBar: AppBar(
        backgroundColor: const Color(0xFF161426),
        title: const Text(
          "My Profile",
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 18),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings, color: Colors.white),
            onPressed: _showSettingsMenu,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Profile Card Info
            Center(
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 48,
                    backgroundColor: const Color(0xFF6366F1),
                    child: Text(
                      user.name[0].toUpperCase(),
                      style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    user.name,
                    style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    user.title,
                    style: TextStyle(color: Colors.white.withOpacity(0.4), fontSize: 13),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFF10B981).withOpacity(0.12),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      "Trust Score: ${user.trustScore}",
                      style: const TextStyle(color: Color(0xFF10B981), fontSize: 10, fontWeight: FontWeight.w800),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),

            // Profile Metrics Row
            Row(
              children: [
                _buildMetricItem("Completed", "${user.swapsCount} Swaps", Icons.sync_alt),
                const SizedBox(width: 16),
                _buildMetricItem("Average Rating", "${user.ratingValue} ★", Icons.star),
              ],
            ),
            const SizedBox(height: 32),

            // Bio Section
            const Text(
              "BIO",
              style: TextStyle(color: Colors.white30, fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.5),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF161426),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white.withOpacity(0.04)),
              ),
              child: Text(
                user.bio,
                style: const TextStyle(color: Colors.white70, fontSize: 13, height: 1.4),
              ),
            ),
            const SizedBox(height: 24),

            // Teaches & Wants List
            _buildSkillSection("SKILLS I CAN TEACH", user.teaches, const Color(0xFF10B981), isTeaching: true),
            const SizedBox(height: 24),
            _buildSkillSection("SKILLS I WANT TO LEARN", user.wants, const Color(0xFF6366F1), isTeaching: false),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildMetricItem(String label, String value, IconData icon) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: const Color(0xFF161426),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withOpacity(0.04)),
        ),
        child: Column(
          children: [
            Icon(icon, color: const Color(0xFF6366F1), size: 20),
            const SizedBox(height: 8),
            Text(
              value,
              style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(color: Colors.white.withOpacity(0.3), fontSize: 11),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSkillSection(String header, List<String> skills, Color chipColor, {bool isTeaching = false}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          header,
          style: const TextStyle(color: Colors.white30, fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.5),
        ),
        const SizedBox(height: 10),
        skills.isEmpty
            ? Text(
                "No skills added yet.",
                style: TextStyle(color: Colors.white.withOpacity(0.3), fontSize: 12),
              )
            : isTeaching
                ? Column(
                    children: skills.map((s) {
                      final score = _user?.skillScores[s] ?? 90; // default simulated score
                      final rating = _user?.skillRatings[s] ?? 0.0;
                      final ratingText = rating > 0 ? "$rating ★" : "No reviews";

                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFF161426),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: Colors.white.withOpacity(0.04)),
                          gradient: LinearGradient(
                            colors: [const Color(0xFF10B981).withOpacity(0.05), Colors.transparent],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  s,
                                  style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w800),
                                ),
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFF10B981).withOpacity(0.12),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        "Test Score: $score%",
                                        style: const TextStyle(color: Color(0xFF10B981), fontSize: 10, fontWeight: FontWeight.w800),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFF59E0B).withOpacity(0.12),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          const Icon(Icons.star, color: Color(0xFFF59E0B), size: 10),
                                          const SizedBox(width: 4),
                                          Text(
                                            ratingText,
                                            style: const TextStyle(color: Color(0xFFF59E0B), fontSize: 10, fontWeight: FontWeight.w800),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                            Icon(Icons.verified, color: const Color(0xFF10B981).withOpacity(0.8), size: 24),
                          ],
                        ),
                      );
                    }).toList(),
                  )
                : Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: skills.map((s) {
                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          color: chipColor.withOpacity(0.08),
                          borderRadius: BorderRadius.circular(30),
                          border: Border.all(color: chipColor.withOpacity(0.2)),
                        ),
                        child: Text(
                          s,
                          style: TextStyle(color: chipColor, fontSize: 12, fontWeight: FontWeight.w700),
                        ),
                      );
                    }).toList(),
                  ),
      ],
    );
  }
}
