import 'dart:async';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/user_model.dart';
import '../models/session_model.dart';

class FirebaseService {
  static final FirebaseService _instance = FirebaseService._internal();
  factory FirebaseService() => _instance;
  FirebaseService._internal();

  bool get useMock => _useMock;
  bool _useMock = true;

  // Local memory databases for robust offline/demo testing
  final List<UserModel> _mockUsers = [];
  final List<SessionModel> _mockSessions = [];
  final Map<String, List<Map<String, dynamic>>> _mockChats = {};

  String? _currentUserId;

  void setMockMode(bool enable) {
    _useMock = enable;
  }

  void setCurrentUser(String? userId) {
    _currentUserId = userId;
  }

  String? getCurrentUserId() => _currentUserId;

  // Initialize service & seed demo data for instant out-of-the-box preview
  Future<void> initialize() async {
    try {
      // Check if Firebase is running
      // If initialized, set _useMock to false
      _useMock = false;
    } catch (e) {
      _useMock = true;
      _seedDemoData();
    }
  }

  void _seedDemoData() {
    if (_mockUsers.isNotEmpty) return;
    _mockUsers.addAll([
      UserModel(
        id: "user_1",
        name: "Sarah Jenkins",
        email: "sarah@gmail.com",
        title: "Senior UI/UX Designer",
        teaches: ["Figma", "UI/UX Prototyping"],
        wants: ["Flutter", "Dart"],
        bio: "Designing interfaces that bridge aesthetics with pure utility. Let's swap knowledge!",
        ratingValue: "4.8",
        swapsCount: "12",
        ratingsReceived: [5.0, 4.0, 5.0, 5.0],
        skillScores: const {"Figma": 95, "UI/UX Prototyping": 90},
        skillRatings: const {"Figma": 4.8, "UI/UX Prototyping": 4.9},
      ),
      UserModel(
        id: "user_2",
        name: "David Kim",
        email: "david@gmail.com",
        title: "Mobile App Architect",
        teaches: ["Flutter", "Dart", "Firebase"],
        wants: ["Figma", "Interaction Design"],
        bio: "App developer by day, mentor by night. I write production Flutter code.",
        ratingValue: "4.9",
        swapsCount: "25",
        ratingsReceived: [5.0, 5.0, 4.8, 5.0],
        skillScores: const {"Flutter": 100, "Dart": 90, "Firebase": 95},
        skillRatings: const {"Flutter": 4.9, "Dart": 4.8, "Firebase": 4.9},
      ),
    ]);
  }

  // --- USER API ---
  Future<UserModel?> getUser(String userId) async {
    if (_useMock) {
      return _mockUsers.firstWhere((u) => u.id == userId, orElse: () => UserModel(id: userId, name: "User $userId", email: "user@demo.com"));
    }
    final snap = await FirebaseFirestore.instance.collection('users').doc(userId).get();
    if (snap.exists) {
      return UserModel.fromMap(snap.data()!, snap.id);
    }
    return null;
  }

  Future<void> createUser(UserModel user) async {
    if (_useMock) {
      _mockUsers.removeWhere((u) => u.id == user.id);
      _mockUsers.add(user);
      return;
    }
    await FirebaseFirestore.instance.collection('users').doc(user.id).set(user.toMap());
  }

  Future<void> updateUser(String userId, Map<String, dynamic> data) async {
    if (_useMock) {
      final idx = _mockUsers.indexWhere((u) => u.id == userId);
      if (idx != -1) {
        final existing = _mockUsers[idx];
        final updatedMap = existing.toMap()..addAll(data);
        _mockUsers[idx] = UserModel.fromMap(updatedMap, userId);
      }
      return;
    }
    await FirebaseFirestore.instance.collection('users').doc(userId).update(data);
  }

  Future<List<UserModel>> getDiscoverUsers() async {
    if (_useMock) {
      return _mockUsers.where((u) => u.id != _currentUserId).toList();
    }
    final q = await FirebaseFirestore.instance.collection('users').get();
    return q.docs
        .where((doc) => doc.id != _currentUserId)
        .map((doc) => UserModel.fromMap(doc.data(), doc.id))
        .toList();
  }

  Future<void> deleteUser(String userId) async {
    if (_useMock) {
      _mockUsers.removeWhere((u) => u.id == userId);
      _mockSessions.removeWhere((s) => s.userId == userId || s.partnerId == userId);
      return;
    }
    // Delete Firestore record
    await FirebaseFirestore.instance.collection('users').doc(userId).delete();
    
    // Clean up associated sessions
    final sessSnap = await FirebaseFirestore.instance
        .collection('sessions')
        .where('userId', isEqualTo: userId)
        .get();
    for (var doc in sessSnap.docs) {
      await doc.reference.delete();
    }
    final partnerSessSnap = await FirebaseFirestore.instance
        .collection('sessions')
        .where('partnerId', isEqualTo: userId)
        .get();
    for (var doc in partnerSessSnap.docs) {
      await doc.reference.delete();
    }
  }

  // --- SESSIONS API ---
  Future<List<SessionModel>> getSessions() async {
    if (_useMock) {
      return _mockSessions.where((s) => s.userId == _currentUserId).toList();
    }
    final q = await FirebaseFirestore.instance
        .collection('sessions')
        .where('userId', isEqualTo: _currentUserId)
        .get();
    return q.docs.map((doc) => SessionModel.fromMap(doc.data(), doc.id)).toList();
  }

  Future<void> createSession(SessionModel session) async {
    if (_useMock) {
      _mockSessions.removeWhere((s) => s.id == session.id);
      _mockSessions.add(session);
      return;
    }
    await FirebaseFirestore.instance.collection('sessions').doc(session.id).set(session.toMap());
  }

  Future<void> updateSessionStatus(String sessionId, String status, {bool isDone = false}) async {
    if (_useMock) {
      final idx = _mockSessions.indexWhere((s) => s.id == sessionId);
      if (idx != -1) {
        final existing = _mockSessions[idx];
        final updatedMap = existing.toMap()
          ..['status'] = status
          ..['isDone'] = isDone
          ..['liveSoon'] = false;
        _mockSessions[idx] = SessionModel.fromMap(updatedMap, sessionId);

        // Also update matching partner session
        final partnerIdx = _mockSessions.indexWhere((s) => s.groupId == existing.groupId && s.id != sessionId);
        if (partnerIdx != -1) {
          final partnerExisting = _mockSessions[partnerIdx];
          final partnerUpdatedMap = partnerExisting.toMap()
            ..['status'] = status
            ..['isDone'] = isDone
            ..['liveSoon'] = false;
          _mockSessions[partnerIdx] = SessionModel.fromMap(partnerUpdatedMap, partnerExisting.id);
        }
      }
      return;
    }

    final docRef = FirebaseFirestore.instance.collection('sessions').doc(sessionId);
    await docRef.update({
      'status': status,
      'isDone': isDone,
      'liveSoon': false,
    });

    final snap = await docRef.get();
    if (snap.exists) {
      final groupId = snap.data()?['groupId'];
      if (groupId != null && groupId.toString().isNotEmpty) {
        final partnerSnap = await FirebaseFirestore.instance
            .collection('sessions')
            .where('groupId', isEqualTo: groupId)
            .get();
        for (var doc in partnerSnap.docs) {
          if (doc.id != sessionId) {
            await doc.reference.update({
              'status': status,
              'isDone': isDone,
              'liveSoon': false,
            });
          }
        }
      }
    }
  }

  Future<void> acceptSessionAndSchedule(String sessionId, String date, String time, String duration, int sessionCount) async {
    if (_useMock) {
      final idx = _mockSessions.indexWhere((s) => s.id == sessionId);
      if (idx != -1) {
        final existing = _mockSessions[idx];
        final updatedMap = existing.toMap()
          ..['status'] = 'accepted'
          ..['date'] = date
          ..['time'] = time
          ..['duration'] = duration
          ..['sessionCount'] = sessionCount
          ..['isInbound'] = false;
        _mockSessions[idx] = SessionModel.fromMap(updatedMap, sessionId);

        final partnerIdx = _mockSessions.indexWhere((s) => s.groupId == existing.groupId && s.id != sessionId);
        if (partnerIdx != -1) {
          final partnerExisting = _mockSessions[partnerIdx];
          final partnerUpdatedMap = partnerExisting.toMap()
            ..['status'] = 'accepted'
            ..['date'] = date
            ..['time'] = time
            ..['duration'] = duration
            ..['sessionCount'] = sessionCount
            ..['isInbound'] = false;
          _mockSessions[partnerIdx] = SessionModel.fromMap(partnerUpdatedMap, partnerExisting.id);
        }

        // Increment completed swapsCount for both profiles
        for (var uid in [existing.userId, existing.partnerId]) {
          final uIdx = _mockUsers.indexWhere((u) => u.id == uid);
          if (uIdx != -1) {
            final uObj = _mockUsers[uIdx];
            final curSwaps = int.tryParse(uObj.swapsCount) ?? 0;
            _mockUsers[uIdx] = UserModel.fromMap(
              uObj.toMap()..['swapsCount'] = (curSwaps + 1).toString(),
              uid,
            );
          }
        }
      }
      return;
    }

    final docRef = FirebaseFirestore.instance.collection('sessions').doc(sessionId);
    await docRef.update({
      'status': 'accepted',
      'date': date,
      'time': time,
      'duration': duration,
      'sessionCount': sessionCount,
      'isInbound': false,
    });

    final snap = await docRef.get();
    if (snap.exists) {
      final groupId = snap.data()?['groupId'];
      final uId = snap.data()?['userId'];
      final partnerId = snap.data()?['partnerId'];

      if (groupId != null) {
        final partnerSnap = await FirebaseFirestore.instance
            .collection('sessions')
            .where('groupId', isEqualTo: groupId)
            .get();
        for (var doc in partnerSnap.docs) {
          if (doc.id != sessionId) {
            await doc.reference.update({
              'status': 'accepted',
              'date': date,
              'time': time,
              'duration': duration,
              'sessionCount': sessionCount,
              'isInbound': false,
            });
          }
        }
      }

      // Automatically increment swaps count in both user profiles upon acceptance
      for (var id in [uId, partnerId]) {
        if (id != null) {
          final uDoc = FirebaseFirestore.instance.collection('users').doc(id);
          final uSnap = await uDoc.get();
          if (uSnap.exists) {
            final swaps = int.tryParse(uSnap.data()?['swapsCount'] ?? '0') ?? 0;
            await uDoc.update({'swapsCount': (swaps + 1).toString()});
          }
        }
      }
    }
  }

  // --- RATING API ---
  Future<void> submitRatingAndReview(String targetUserId, double score, {String? skill}) async {
    if (_useMock) {
      final idx = _mockUsers.indexWhere((u) => u.id == targetUserId);
      if (idx != -1) {
        final u = _mockUsers[idx];
        final list = List<double>.from(u.ratingsReceived)..add(score);
        final avg = list.reduce((a, b) => a + b) / list.length;
        
        final skillRatings = Map<String, double>.from(u.skillRatings);
        if (skill != null && skill.isNotEmpty) {
          skillRatings[skill] = score;
        }

        _mockUsers[idx] = UserModel.fromMap(
          u.toMap()
            ..['ratingsReceived'] = list
            ..['ratingValue'] = avg.toStringAsFixed(1)
            ..['skillRatings'] = skillRatings,
          targetUserId,
        );
      }
      return;
    }

    final docRef = FirebaseFirestore.instance.collection('users').doc(targetUserId);
    final snap = await docRef.get();
    if (snap.exists) {
      final list = List<double>.from((snap.data()?['ratingsReceived'] ?? []).map((x) => x.toDouble()));
      list.add(score);
      final avg = list.reduce((a, b) => a + b) / list.length;

      final skillRatings = Map<String, double>.from(snap.data()?['skillRatings'] ?? {});
      if (skill != null && skill.isNotEmpty) {
        skillRatings[skill] = score;
      }

      await docRef.update({
        'ratingsReceived': list,
        'ratingValue': avg.toStringAsFixed(1),
        'skillRatings': skillRatings,
      });
    }
  }

  // --- CHATS API ---
  Future<List<Map<String, dynamic>>> getChats(String partnerId) async {
    if (_useMock) {
      if (!_mockChats.containsKey(partnerId)) _mockChats[partnerId] = [];
      return _mockChats[partnerId]!;
    }
    // Real Firestore collection query
    final snap = await FirebaseFirestore.instance
        .collection('chats')
        .where('senderId', whereIn: [_currentUserId, partnerId])
        .get();
    return snap.docs
        .where((doc) =>
            (doc['senderId'] == _currentUserId && doc['receiverId'] == partnerId) ||
            (doc['senderId'] == partnerId && doc['receiverId'] == _currentUserId))
        .map((doc) => doc.data())
        .toList()
      ..sort((a, b) => (a['timestamp'] ?? 0).compareTo(b['timestamp'] ?? 0));
  }

  Future<void> sendChatMessage(String partnerId, String text) async {
    final msg = {
      'senderId': _currentUserId ?? 'demo',
      'receiverId': partnerId,
      'text': text,
      'timestamp': DateTime.now().millisecondsSinceEpoch,
    };
    if (_useMock) {
      if (!_mockChats.containsKey(partnerId)) _mockChats[partnerId] = [];
      _mockChats[partnerId]!.add(msg);
      return;
    }
    await FirebaseFirestore.instance.collection('chats').add(msg);
  }
}
