import 'package:flutter/material.dart';
import 'discover_screen.dart';
import 'chats_screen.dart';
import 'sessions_screen.dart';
import 'profile_screen.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _currentTab = 0;

  final List<Widget> _screens = [
    const DiscoverScreen(), // Discover Swappers
    const DiscoverScreen(), // Placeholder/Discover Copy
    const ChatsScreen(),    // Chats View
    const SessionsScreen(), // Sessions view
    const ProfileScreen(),  // Profile view
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F0E17),
      body: _screens[_currentTab],
      bottomNavigationBar: Container(
        height: 72,
        decoration: BoxDecoration(
          color: const Color(0xFF161426),
          border: Border(
            top: BorderSide(color: Colors.white.withOpacity(0.06), width: 1),
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _buildNavItem(0, Icons.explore, "Home"),
            _buildNavItem(1, Icons.search, "Discover"),
            _buildNavItem(2, Icons.message, "Chat"),
            _buildNavItem(3, Icons.calendar_today, "Sessions"),
            _buildNavItem(4, Icons.person, "Profile"),
          ],
        ),
      ),
    );
  }

  Widget _buildNavItem(int index, IconData icon, String label) {
    final isActive = _currentTab == index;
    return GestureDetector(
      onTap: () {
        setState(() {
          _currentTab = index;
        });
      },
      behavior: HitTestBehavior.opaque,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            icon,
            size: 22,
            color: isActive ? const Color(0xFF6366F1) : Colors.white.withOpacity(0.3),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: isActive ? FontWeight.w800 : FontWeight.w500,
              color: isActive ? const Color(0xFF6366F1) : Colors.white.withOpacity(0.3),
            ),
          ),
        ],
      ),
    );
  }
}
