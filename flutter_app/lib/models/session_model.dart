class SessionModel {
  final String id;
  final String groupId;
  final String userId;
  final String partnerId;
  final String partnerName;
  final String title;
  final String date;        // Custom chosen date, e.g. "2026-05-29"
  final String time;        // Custom chosen time, e.g. "16:00"
  final String duration;    // e.g. "60 mins"
  final int sessionCount;   // e.g. 3 sessions
  final String skill;       // e.g. "Figma" or "Flutter"
  final bool liveSoon;
  final bool isDone;
  final String status;      // 'pending' | 'accepted' | 'completed'
  final bool isInbound;

  SessionModel({
    required this.id,
    required this.groupId,
    required this.userId,
    required this.partnerId,
    required this.partnerName,
    required this.title,
    required this.date,
    required this.time,
    required this.duration,
    required this.sessionCount,
    required this.skill,
    this.liveSoon = false,
    this.isDone = false,
    required this.status,
    required this.isInbound,
  });

  factory SessionModel.fromMap(Map<String, dynamic> map, String docId) {
    return SessionModel(
      id: docId,
      groupId: map['groupId'] ?? '',
      userId: map['userId'] ?? '',
      partnerId: map['partnerId'] ?? '',
      partnerName: map['partnerName'] ?? '',
      title: map['title'] ?? '',
      date: map['date'] ?? '',
      time: map['time'] ?? '',
      duration: map['duration'] ?? '',
      sessionCount: map['sessionCount'] ?? 1,
      skill: map['skill'] ?? 'General Skills',
      liveSoon: map['liveSoon'] ?? false,
      isDone: map['isDone'] ?? false,
      status: map['status'] ?? 'pending',
      isInbound: map['isInbound'] ?? false,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'groupId': groupId,
      'userId': userId,
      'partnerId': partnerId,
      'partnerName': partnerName,
      'title': title,
      'date': date,
      'time': time,
      'duration': duration,
      'sessionCount': sessionCount,
      'skill': skill,
      'liveSoon': liveSoon,
      'isDone': isDone,
      'status': status,
      'isInbound': isInbound,
    };
  }
}
