class UserModel {
  final String id;
  final String name;
  final String email;
  final String trustScore;
  final String swapsCount;
  final String ratingValue;
  final String communitiesCount;
  final String bio;
  final String about;
  final List<String> teaches;
  final List<String> wants;
  final List<String> joinedCircles;
  final String title;
  final String availability;
  final String language;
  final String experience;
  final List<double> ratingsReceived;

  final Map<String, int> skillScores;
  final Map<String, double> skillRatings;

  UserModel({
    required this.id,
    required this.name,
    required this.email,
    this.trustScore = '98%',
    this.swapsCount = '0',
    this.ratingValue = '0.0',
    this.communitiesCount = '0',
    this.bio = 'Passionate about learning and sharing knowledge. Let\'s grow together!',
    this.about = 'I am a new Explorer on the SkillSwap platform! Let\'s swap some cool skills.',
    this.teaches = const ['General / Academics'],
    this.wants = const ['Programming / Coding'],
    this.joinedCircles = const [],
    this.title = 'SkillSwap Explorer',
    this.availability = 'Weekends, Flexible Timings',
    this.language = 'English',
    this.experience = '1+ Years',
    this.ratingsReceived = const [],
    this.skillScores = const {},
    this.skillRatings = const {},
  });

  factory UserModel.fromMap(Map<String, dynamic> map, String docId) {
    // Parse skillScores
    final rawScores = map['skillScores'] ?? const {};
    final parsedScores = Map<String, int>.from(
      rawScores.map((k, v) => MapEntry(k.toString(), (v as num).toInt())),
    );

    // Parse skillRatings
    final rawRatings = map['skillRatings'] ?? const {};
    final parsedRatings = Map<String, double>.from(
      rawRatings.map((k, v) => MapEntry(k.toString(), (v as num).toDouble())),
    );

    return UserModel(
      id: docId,
      name: map['name'] ?? '',
      email: map['email'] ?? '',
      trustScore: map['trustScore'] ?? '98%',
      swapsCount: map['swapsCount'] ?? '0',
      ratingValue: map['ratingValue'] ?? '0.0',
      communitiesCount: map['communitiesCount'] ?? '0',
      bio: map['bio'] ?? '',
      about: map['about'] ?? '',
      teaches: List<String>.from(map['teaches'] ?? const []),
      wants: List<String>.from(map['wants'] ?? const []),
      joinedCircles: List<String>.from(map['joinedCircles'] ?? const []),
      title: map['title'] ?? 'SkillSwap Explorer',
      availability: map['availability'] ?? 'Weekends, Flexible Timings',
      language: map['language'] ?? 'English',
      experience: map['experience'] ?? '1+ Years',
      ratingsReceived: List<double>.from((map['ratingsReceived'] ?? const []).map((x) => x.toDouble())),
      skillScores: parsedScores,
      skillRatings: parsedRatings,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'name': name,
      'email': email,
      'trustScore': trustScore,
      'swapsCount': swapsCount,
      'ratingValue': ratingValue,
      'communitiesCount': communitiesCount,
      'bio': bio,
      'about': about,
      'teaches': teaches,
      'wants': wants,
      'joinedCircles': joinedCircles,
      'title': title,
      'availability': availability,
      'language': language,
      'experience': experience,
      'ratingsReceived': ratingsReceived,
      'skillScores': skillScores,
      'skillRatings': skillRatings,
    };
  }
}
