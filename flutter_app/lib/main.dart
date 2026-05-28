import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'services/firebase_service.dart';
import 'screens/onboarding_screen.dart';
import 'screens/home_shell.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Firebase (safely catching errors for local/demo sandboxed execution)
  try {
    await Firebase.initializeApp();
  } catch (e) {
    debugPrint("[Firebase] Initialization skipped. Running in high-fidelity mock sandboxed mode.");
  }

  // Initialize and seed local memory databases in the Firebase Service
  final service = FirebaseService();
  await service.initialize();

  // Check SharedPreferences for persistent login sessions
  final prefs = await SharedPreferences.getInstance();
  final savedToken = prefs.getString('skillswap_token');
  
  if (savedToken != null && savedToken.isNotEmpty) {
    service.setCurrentUser(savedToken);
  }

  runApp(SkillSwapApp(isLoggedIn: savedToken != null && savedToken.isNotEmpty));
}

class SkillSwapApp extends StatelessWidget {
  final bool isLoggedIn;
  
  const SkillSwapApp({super.key, required this.isLoggedIn});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SkillSwap',
      debugShowCheckedModeBanner: false,
      
      // Gorgeous premium Dark Purple aesthetic matching Capactior React design
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0F0E17),
        primaryColor: const Color(0xFF6366F1),
        
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF6366F1),
          secondary: Color(0xFF8B5CF6),
          background: Color(0xFF0F0E17),
          surface: Color(0xFF161426),
          error: Colors.redAccent,
        ),
        
        textTheme: const TextTheme(
          bodyLarge: TextStyle(color: Colors.white, fontFamily: 'Outfit'),
          bodyMedium: TextStyle(color: Colors.white70, fontFamily: 'Outfit'),
        ),
        
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF161426),
          elevation: 0,
          iconTheme: IconThemeData(color: Colors.white),
        ),
        
        useMaterial3: true,
      ),
      
      home: isLoggedIn ? const HomeShell() : const OnboardingScreen(),
    );
  }
}
