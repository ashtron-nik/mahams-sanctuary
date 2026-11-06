(function () {
  if (window.FeatureFlags && !window.FeatureFlags.get('quiz')) return;
  var PAGE = document.body.dataset.page || '';
  var QUIZZES = getDefaultQuizzes();
  var USED_KEYS = {};

  function getDefaultQuizzes() {
    return [
      // 100-organs section 0 — The Beginning
      {
        id: '100-organs-the-beginning', page: '100-organs', sectionIdx: 0, title: 'The Beginning',
        questions: [
          { question: 'What time was it when the author started writing Entry 1?', options: ['2:15 AM', '3:27 AM', '4:00 AM', '1:30 AM'], answer: 1 },
          { question: 'What did the author send along with his message in Entry 1?', options: ['A photo', 'A cuddling voice note', 'A song', 'A poem'], answer: 1 },
          { question: 'According to Entry 2, what does  spend too much time doing?', options: ['Working too hard', 'Searching for flaws in herself', 'Overthinking the future', 'Worrying about others'], answer: 1 },
          { question: 'What color do \'s eyes become in the sun rays?', options: ['Green', 'Blue', 'Golden', 'Hazel'], answer: 2 },
          { question: 'What does the author hope  stops trying to become?', options: ['More confident', 'Someone prettier', 'More successful', 'Perfect'], answer: 1 },
          { question: 'How does the author describe the person  already is?', options: ['Beautiful', 'Talented', 'Enough', 'Strong'], answer: 2 },
          { question: 'In Entry 4, what specific video of \'s face is mentioned?', options: ['The birthday video', 'The red night suit video', 'The morning selfie', 'The laugh video'], answer: 1 },
          { question: 'What happens to \'s pupils when she sees the author?', options: ['They contract', 'They dilate', 'They change color', 'They water'], answer: 1 },
          { question: 'What did  do after receiving the author\'s message in Entry 1?', options: ['She replied instantly', 'She smiled and fell asleep', 'She called him', 'She sent a photo'], answer: 1 },
          { question: 'What does the author call these entries in Entry 1?', options: ['A collection of memories', 'One hundred little love letters', 'A diary of us', 'My thoughts about you'], answer: 1 }
        ]
      },
      // 100-organs section 1 — Face & Expressions
      {
        id: '100-organs-face-expressions', page: '100-organs', sectionIdx: 1, title: 'Face & Expressions',
        questions: [
          { question: 'What does the left eyebrow do according to the text?', options: ['Furrows when angry', 'Lifts to reveal thoughts', 'Stays perfectly still', 'Twitches when nervous'], answer: 1 },
          { question: 'What is the tear duct described as?', options: ['The window to the soul', 'The safety valve of a heart that feels everything', 'A tiny fountain of emotion', 'The source of all tears'], answer: 1 },
          { question: 'What part of the ear is described as "delicate architecture" with a "tiny seashell"?', options: ['The earlobe', 'The cochlea/inner ear', 'The eardrum', 'The outer ear'], answer: 1 },
          { question: 'What does the author want to do to \'s cheeks ()?', options: ['Kiss them gently', 'Bite them and hold them while asking questions', 'Caress them softly', 'Pinch them playfully'], answer: 1 },
          { question: 'What happens to \'s lips when she is horny?', options: ['She pouts them', 'She bites them', 'She licks them', 'She smiles'], answer: 1 },
          { question: 'How many types of smiles does the author describe?', options: ['One — genuine', 'Two — admired vs remembered', 'Three — polite, happy, joyful', 'Four — each unique'], answer: 1 },
          { question: 'What are sinuses described as?', options: ['Empty spaces in the skull', 'Secret rooms designed for making you sound the way you do', 'Air filters for breathing', 'Bone cavities'], answer: 1 },
          { question: 'What does  do with her teeth according to the text?', options: ['She shows them when smiling', 'She tries to hide them subconsciously', 'She grinds them at night', 'She bites her nails'], answer: 1 },
          { question: 'What does the author say about eyelashes in Entry 14?', options: ['They are naturally curled', 'There is a specific reference to "the wallpaper pic" with lashes', 'They are long and dark', 'They frame her eyes perfectly'], answer: 1 },
          { question: 'What does the tongue do first according to Entry 42?', options: ['Whispers secrets', 'Touches his when they kiss', 'Tastes food', 'Says "I love you"'], answer: 1 }
        ]
      },
      // 100-organs section 2 — Upper Body
      {
        id: '100-organs-upper-body', page: '100-organs', sectionIdx: 2, title: 'Upper Body',
        questions: [
          { question: 'How is \'s jawline described?', options: ['Sharp and defined', 'Gently curved, not sharp', 'Square and strong', 'Soft and round'], answer: 1 },
          { question: 'Where was the specific neck kiss mentioned?', options: ['In the park', 'In the electrical department', 'At her house', 'In a restaurant'], answer: 1 },
          { question: 'What does the author imagine while thinking about her neck and showering?', options: ['Water drenching over her neck', 'Kissing her neck in the rain', 'Touching her neck while she sleeps', 'Watching her dry her hair'], answer: 0 },
          { question: 'What are collarbones described as?', options: ['Elegant arches', 'Turn-on points', 'Delicate bones', 'Beautiful curves'], answer: 1 },
          { question: 'What does the author say about elbows?', options: ['They are bony and sharp', 'They never ask to be noticed', 'They are cute', 'They are always bruised'], answer: 1 },
          { question: 'Which part has the most tender skin with faint blue veins?', options: ['The neck', 'The inner wrist', 'The collarbone', 'The shoulder'], answer: 1 },
          { question: 'What does hugging her feel like according to the shoulders entry?', options: ['Warm and safe', 'The noise of the world becomes quieter', 'Like coming home', 'Like flying'], answer: 1 },
          { question: 'What is the nape of her neck associated with?', options: ['Kissing her there while she is far away', 'Touching it gently', 'Breathing on it', 'All of the above'], answer: 0 },
          { question: 'What are her armpits described as?', options: ['Ticklish', 'The most honest version of her', 'Sensitive', 'Soft'], answer: 1 },
          { question: 'What do her hands tell according to the hands entry?', options: ['Her age', 'The story of her heart', 'Her profession', 'Her habits'], answer: 1 }
        ]
      },
      // 100-organs section 3 — Torso & Core
      {
        id: '100-organs-torso-core', page: '100-organs', sectionIdx: 3, title: 'Torso & Core',
        questions: [
          { question: 'What specific abdominal muscles are named?', options: ['Traps and lats', 'Rectus abdominis and obliques', 'Pectorals and deltoids', 'Glutes and hamstrings'], answer: 1 },
          { question: 'What oil does the author mention for massages?', options: ['Olive oil', 'Coconut oil', 'Almond oil', 'Baby oil'], answer: 1 },
          { question: 'What body part is described as the "most sacred part"?', options: ['The heart', 'The vagina', 'The breasts', 'The lips'], answer: 1 },
          { question: 'Where is the specific mole mentioned?', options: ['On her cheek', 'On her breast that only the author knows about', 'On her back', 'On her shoulder'], answer: 1 },
          { question: 'How is the belly button described?', options: ['A tiny scar', 'Part of the story of how every human begins', 'A cute little indent', 'The center of the body'], answer: 1 },
          { question: 'What happens when she laughs that deep belly laugh?', options: ['She snorts', 'Her whole torso shakes', 'She cries', 'She claps her hands'], answer: 1 },
          { question: 'What does the author want to do while kissing her waist?', options: ['Hold her tightly', 'Oil it up with coconut oil and massage', 'Trace circles on it', 'Lift her up'], answer: 1 },
          { question: 'What does he say about her breasts?', options: ['They are beautiful', 'Absolute perfection — a specific pic turned him on', 'They are soft', 'He dreams about them'], answer: 1 },
          { question: 'What happens to her nipples when she is turned on?', options: ['They become hard', 'They get sensitive and beautifully sore', 'They change color', 'They tingle'], answer: 1 },
          { question: 'How does she react when he puts fingers inside her?', options: ['She moans', 'She gets wet and her body tightens around his fingers', 'She cries', 'She laughs'], answer: 1 }
        ]
      },
      // 100-organs section 4 — Skin, Skeleton & Organs
      {
        id: '100-organs-skin-skeleton-organs', page: '100-organs', sectionIdx: 4, title: 'Skin, Skeleton & Organs',
        questions: [
          { question: 'What are pores described as?', options: ['Tiny holes in the skin', 'Millions of tiny openings like a secret map', 'Breathing points', 'Oil producers'], answer: 1 },
          { question: 'What are the two types of sweat glands mentioned?', options: ['Wet and dry', 'Eccrine and apocrine', 'Hot and cold', 'Surface and deep'], answer: 1 },
          { question: 'What are freckles compared to?', options: ['Little dots of sunshine', 'Little memories scattered across skin', 'Tiny stars', 'Kisses from the sun'], answer: 1 },
          { question: 'What are scars described as?', options: ['Imperfections', 'Chapters — proof healing is possible', 'Marks of the past', 'Battle wounds'], answer: 1 },
          { question: 'Where does the author hear happiness according to the laugh entry?', options: ['In her singing', 'In her laugh — "If someone asked me what happiness sounds like, it sounds like you"', 'In her voice', 'In her whisper'], answer: 1 },
          { question: 'What are sebaceous glands described as?', options: ['Oil producers', 'Tiny oil factories attached to each hair follicle', 'Sweat producers', 'Skin cells'], answer: 1 },
          { question: 'What do nerve endings do?', options: ['Send pain signals', 'Bridge between touch and feeling', 'Regulate temperature', 'Control movement'], answer: 1 },
          { question: 'What does the author say about her skeleton?', options: ['It is fragile', 'Quiet invisible architecture that held her upright when everything was collapsing', 'It is strong', 'It is delicate'], answer: 1 },
          { question: 'What is the ribcage described as?', options: ['A cage', 'A bony cage protecting heart and lungs — a fortress of her life', 'A shield', 'A frame'], answer: 1 },
          { question: 'What causes her to blush?', options: ['Embarrassment', 'Something she cannot choose — appears before her words do', 'The cold', 'Compliments'], answer: 1 }
        ]
      },
      // 100-organs section 5 — Soul & Emotions
      {
        id: '100-organs-soul-emotions', page: '100-organs', sectionIdx: 5, title: 'Soul & Emotions',
        questions: [
          { question: 'What is her warmth compared to?', options: ['A warm blanket', 'First light of morning — stays quietly, patiently, constantly', 'A cozy fire', 'The sun'], answer: 1 },
          { question: 'What does her presence do to a room?', options: ['Makes it louder', 'Makes it more complete — not louder or brighter, just more', 'Makes it brighter', 'Makes it warmer'], answer: 1 },
          { question: 'What has her heart carried?', options: ['Only joy', 'Dreams that kept her awake and fears she never spoke about', 'Only love', 'Everything'], answer: 1 },
          { question: 'How does the author describe her mind?', options: ['Overactive and chaotic', 'The most beautiful place — endlessly fascinating because it is never still', 'Brilliant and sharp', 'Quiet and deep'], answer: 1 },
          { question: 'What is the soul described as?', options: ['The essence of a person', 'The quietest and most beautiful part of her — why every beautiful thing exists', 'The eternal part of us', 'The spark of life'], answer: 1 },
          { question: 'What does she notice that others walk past?', options: ['Beautiful scenery', 'Little things', 'People\'s feelings', 'Her own beauty'], answer: 1 },
          { question: 'What does the author wish she could see about her own mind?', options: ['How brilliant it is', 'Not as something that overthinks but as something that loves understanding', 'How creative it is', 'How peaceful it can be'], answer: 1 },
          { question: 'What choice does her heart still make despite everything?', options: ['To love', 'To choose softness over bitterness', 'To hope', 'To stay'], answer: 1 },
          { question: 'What does finding shade after standing in the sun too long represent?', options: ['Her comfort', 'Her presence', 'Her love', 'Her peace'], answer: 1 },
          { question: 'What does the soul speak through according to the text?', options: ['Words', 'Everything she does', 'Her eyes', 'Her touch'], answer: 1 }
        ]
      },
      // 100-organs section 6 — Intimacy & Desire
      {
        id: '100-organs-intimacy-desire', page: '100-organs', sectionIdx: 6, title: 'Intimacy & Desire',
        questions: [
          { question: 'How is foreplay described?', options: ['The beginning of sex', 'Its own universe — not a beginning', 'A prelude', 'Teasing'], answer: 1 },
          { question: 'What are "the three dots" referring to in the sexting entry?', options: ['Three dots in a row', 'The three dots appearing and disappearing while she types back', 'A specific emoji', 'A code word'], answer: 1 },
          { question: 'What body parts does he use for non-penetrative intimacy?', options: ['His lips and tongue', 'His fingers, mouth, and hands', 'His whole body', 'His voice and hands'], answer: 1 },
          { question: 'Where are the pulse points mentioned?', options: ['On her neck', 'Feeling her heartbeat against his lips', 'On her wrists', 'On her chest'], answer: 1 },
          { question: 'What happens to her body temperature when she is aroused?', options: ['It drops', 'It runs warmer — flush across chest, neck glows', 'It stays the same', 'It becomes cold'], answer: 1 },
          { question: 'What does the inner thighs represent?', options: ['Sensitive skin', '"Where everything changes"', 'A ticklish spot', 'A turn-on point'], answer: 1 },
          { question: 'What is behind her ears described as?', options: ['A ticklish spot', 'A "small devastating place"', 'A sensitive area', 'A secret spot'], answer: 1 },
          { question: 'How does she say his name differently?', options: ['In different languages', 'Depending on what she needs — one version is "barely a whisper, breathless"', 'Loudly when excited', 'Softly when sleepy'], answer: 1 },
          { question: 'What does he want to do during foreplay?', options: ['Rush to the end', 'Take her apart piece by piece, slow and deliberate', 'Be rough', 'Talk dirty'], answer: 1 },
          { question: 'What does the lower belly area represent?', options: ['The most sensitive part', 'The soft curve below her navel — not shown to everyone', 'Where he rests his hand', 'The center of desire'], answer: 1 }
        ]
      },
      // 100-organs section 7 — Moments & Scenarios
      {
        id: '100-organs-moments-scenarios', page: '100-organs', sectionIdx: 7, title: 'Moments & Scenarios',
        questions: [
          { question: 'When does she ambush him according to Entry 195?', options: ['When he is sleeping', 'At the most ordinary times', 'When he is working', 'When he is sad'], answer: 1 },
          { question: 'What would he do first if they were together right now?', options: ['Kiss her', 'Pull her close and press his lips to her forehead', 'Hold her hand', 'Say I love you'], answer: 1 },
          { question: 'What would happen to his brain the first time he sees her?', options: ['It would race', 'It would go completely quiet', 'It would explode with thoughts', 'It would forget everything'], answer: 1 },
          { question: 'What does he say about her scent?', options: ['It is pleasant', 'It is embedded in him — he could find her in a dark room', 'It reminds him of flowers', 'It is intoxicating'], answer: 1 },
          { question: 'What does he imagine doing on a rooftop?', options: ['Dancing', 'Watching the sunset and looking at her instead of the sky', 'Talking', 'Singing'], answer: 1 },
          { question: 'What happens after sex in the quiet moments?', options: ['They talk', 'Sacred silence — her breathing evening out', 'They fall asleep', 'They laugh'], answer: 1 },
          { question: 'What is the weight of her in his arms described as?', options: ['Light and fragile', 'The specific irreplaceable weight of a person who trusts you to rest', 'Heavy and comforting', 'Perfect'], answer: 1 },
          { question: 'What does he imagine doing on an abandoned mountain?', options: ['Camping', 'Making out under the moon — cold air makes her press against him', 'Hiking', 'Talking'], answer: 1 },
          { question: 'What does she do in the first time she completely lets go?', options: ['Cries', 'Stops holding anything back — eyes closed', 'Moans loudly', 'Whispers his name'], answer: 1 },
          { question: 'What scenario does he describe for making out on a mountain?', options: ['Late night, full moon, cold air making her press into him', 'Sunset, warm breeze', 'Sunrise after a long night', 'Rainy afternoon'], answer: 0 }
        ]
      },
      // love section 0 — Body Details
      {
        id: 'love-body-details', page: 'love', sectionIdx: 0, title: 'Body Details',
        questions: [
          { question: 'Where does he press his thumbs when the world has been too loud?', options: ['Her shoulders', 'Her temples', 'Her forehead', 'Her neck'], answer: 1 },
          { question: 'Where are the places where her heartbeat becomes visible?', options: ['Chest and arms', 'Wrists, neck, and behind ears', 'Temples and chest', 'Palms and neck'], answer: 1 },
          { question: 'What are her shoulder blades described as?', options: ['Two delicate bones', 'Two wings beneath her skin she never learned to use', 'The hinges of her back', 'Beautiful curves'], answer: 1 },
          { question: 'What does the author say about her belly button?', options: ['It is cute', 'The first home she ever had', 'A tiny scar', 'The centre of her body'], answer: 1 },
          { question: 'What does the author say about her footsteps?', options: ['They are light', 'He knows the sound of her approaching before he sees her', 'They are quick', 'They are heavy'], answer: 1 },
          { question: 'What does the author say about her collarbone?', options: ['It is elegant — first place he wants to kiss when she is wearing something nice', 'It is delicate', 'It is sexy', 'It is sharp'], answer: 0 },
          { question: 'What are her birthmarks described as?', options: ['Imperfections', 'Unique constellations scattered across skin that he has memorized', 'Little dots', 'Moles'], answer: 1 },
          { question: 'Where does his hand find its natural resting place?', options: ['On her waist', 'In the curve that fits perfectly into his palm (the hollow he holds)', 'On her back', 'On her hip'], answer: 1 },
          { question: 'What does her posture say when she is tired?', options: ['She slumps', 'Slightly curved', 'She lies down', 'She stretches'], answer: 1 },
          { question: 'How does she move through a room?', options: ['Quietly', 'She does not enter a space so much as change it — people look up', 'Elegantly', 'Quickly'], answer: 1 }
        ]
      },
      // love section 1 — Voice, Habits & Daily Life
      {
        id: 'love-voice-habits', page: 'love', sectionIdx: 1, title: 'Voice, Habits & Daily Life',
        questions: [
          { question: 'How is her morning voice described?', options: ['Soft and high', 'Raspy, warm, lower, slower, more honest', 'Quiet and gentle', 'Deep and sleepy'], answer: 1 },
          { question: 'What does her real laugh make her do?', options: ['Clap her hands', 'Snort, double over, eyes water', 'Slap her knee', 'Cover her mouth'], answer: 1 },
          { question: 'How does she wake up?', options: ['Abruptly with an alarm', 'Slow, soft, stretches like a cat', 'Immediately alert', 'Grumpy'], answer: 1 },
          { question: 'What does she do when dancing when no one is watching?', options: ['Moves choreographed steps', 'Pure expression, not choreographed — in the kitchen, living room, car', 'Sways gently', 'Bops her head'], answer: 1 },
          { question: 'What does she do with her hands when nervous?', options: ['Clasps them together', 'Fidgets with sleeves, twists hair, taps against thigh', 'Hides them in pockets', 'Wrings them'], answer: 1 },
          { question: 'What does she do when she tidies?', options: ['Sweeps everything under the rug', 'Smooths, folds, arranges — fluffs pillows, aligns coasters', 'Puts things in boxes', 'Quickly picks up'], answer: 1 },
          { question: 'How does she eat according to the comfort food entry?', options: ['Slowly and carefully', 'Sometimes savours every bite, sometimes devours', 'Always fast', 'Always politely'], answer: 1 },
          { question: 'What does her sigh mean?', options: ['Only sadness', 'Relief, exhaustion, settling into peace', 'Boredom', 'Frustration'], answer: 1 },
          { question: 'How does she drift to sleep?', options: ['Immediately', 'Fights sleep sometimes — curls into him or turns away', 'Takes hours', 'Watches videos first'], answer: 1 },
          { question: 'What does her handwriting reveal?', options: ['Her mood', 'It is as unique as her fingerprint', 'Her education', 'Her personality'], answer: 1 }
        ]
      },
      // love section 2 — Personality & Inner World
      {
        id: 'love-personality-inner-world', page: 'love', sectionIdx: 2, title: 'Personality & Inner World',
        questions: [
          { question: 'What does the author say about her solitude?', options: ['She hates being alone', 'She is different alone — more herself, and he respects it', 'She gets lonely', 'She needs company'], answer: 1 },
          { question: 'What does her inner child do?', options: ['Comes out when she is tired', 'Gets excited about small things, believes in magic, wants to be held when scared', 'Makes her playful', 'Makes her childish'], answer: 1 },
          { question: 'How does he describe her intuition?', options: ['She is lucky', 'She knows things before being told — feels the mood of a room', 'She is psychic', 'She is observant'], answer: 1 },
          { question: 'What is her anger described as?', options: ['Something to be afraid of', 'Her spirit refusing to stay silent — fire that rises when something is unfair', 'Dangerous', 'Scary'], answer: 1 },
          { question: 'What does her joy look like?', options: ['Loud and energetic', 'When she forgets to guard herself — pure, contagious', 'Quiet and content', 'Bubbly'], answer: 1 },
          { question: 'What is her loyalty described as?', options: ['Fierce', 'When she loves, she loves completely — does not keep one foot out the door', 'Unshakeable', 'Devoted'], answer: 1 },
          { question: 'What does her humility mean?', options: ['She is shy', 'She does not need to be the centre of attention — has no idea how remarkable she is', 'She is modest', 'She downplays herself'], answer: 1 },
          { question: 'How does she bend without breaking?', options: ['She is rigid', 'Soft enough to bend and strong enough to spring back', 'She breaks sometimes', 'She stands firm'], answer: 1 },
          { question: 'What is her forgiveness described as?', options: ['Hard to earn', 'She finds a way to let go — does not hold grudges or keep score', 'Slow to give', 'Reluctant'], answer: 1 },
          { question: 'What does her creative side show in?', options: ['Her art', 'How she decorates, writes, solves problems', 'Her cooking', 'Her style'], answer: 1 }
        ]
      },
      // love section 3 — Relationships & World
      {
        id: 'love-relationships-world', page: 'love', sectionIdx: 3, title: 'Relationships & World',
        questions: [
          { question: 'What is the weight of her trust described as?', options: ['A gift', 'The most precious thing she gives — she does not trust easily', 'A responsibility', 'An honour'], answer: 1 },
          { question: 'How does she apologize?', options: ['Quickly and moves on', 'Does not apologize just to end conflict — explains perspective without excuses', 'Rarely', 'With gifts'], answer: 1 },
          { question: 'What is her relationship with the mirror?', options: ['She loves her reflection', 'She focuses on flaws — the mirror lies to her', 'She avoids it', 'She checks it often'], answer: 1 },
          { question: 'How does she introduce the author?', options: ['Casually', 'Tone shifts, face softens — introduces him as someone important', 'Quietly', 'Excitedly'], answer: 1 },
          { question: 'What is her energy in a crowd?', options: ['Loud and social', 'More aware, more observant — reads the room, finds his eyes', 'Shy and quiet', 'Anxious'], answer: 1 },
          { question: 'What does she do with the things she collects?', options: ['Displays them', 'Keeps pieces of him — ticket stubs, dried flowers, stones from beaches', 'Throws them away', 'Forgets about them'], answer: 1 },
          { question: 'What is her relationship with music?', options: ['She likes it', 'A language, a time machine, a friend — he knows which songs make her dance/cry/sing', 'Just background noise', 'She sings along'], answer: 1 },
          { question: 'What is her favorite season about?', options: ['The weather', 'The time of year that speaks to her soul — brings out a version of her only then', 'The holidays', 'The fashion'], answer: 1 },
          { question: 'What does she do when she has had a long day?', options: ['Complains about it', 'The quiet unravel — bra off, smile relaxes, shoulders drop', 'Goes straight to bed', 'Takes a shower'], answer: 1 },
          { question: 'What does she do with the stories she repeats?', options: ['Tells them to everyone', 'Memories she returns to — he listens every time even when he has heard it before', 'Forgets them', 'Writes them down'], answer: 1 }
        ]
      },
      // love section 4 — Our Story & Future
      {
        id: 'love-our-story-future', page: 'love', sectionIdx: 4, title: 'Our Story & Future',
        questions: [
          { question: 'What does he remember about the first time he saw her?', options: ['What she was wearing', 'The rest of the world dimmed — his soul knew hers long before his mind caught up', 'Where they were', 'The date'], answer: 1 },
          { question: 'How does he describe the first kiss?', options: ['Perfect like a movie kiss', 'Not perfect in the way movie kisses are — better because it was real', 'Awkward but sweet', 'Magical'], answer: 1 },
          { question: 'What does he say about their arguments?', options: ['They never argue', 'Raised voices, slammed doors, words they wish they could take back — but they always come back', 'They are calm', 'They take breaks'], answer: 1 },
          { question: 'How does she say goodbye?', options: ['Quickly', 'Lingers — one more hug, one more kiss, turns back for one last look, waves once', 'Sadly', 'With a smile'], answer: 1 },
          { question: 'What future does he see with her?', options: ['A big house and cars', 'Slow mornings with coffee, arguments about dishes that end in laughter, growing old together', 'Travel and adventure', 'A quiet life'], answer: 1 },
          { question: 'How does she introduce him to others?', options: ['By his name', 'Tone shifts, face softens — the version of him she describes is someone he wants to become', 'Proudly', 'Casually'], answer: 1 },
          { question: 'What does she do when she comes back after distance?', options: ['Apologizes', 'Every return reminds him their connection is stronger than space', 'Acts like nothing happened', 'Explains why'], answer: 1 },
          { question: 'What is her favorite version of them?', options: ['When they travel', 'Communicating without fighting, laughing until they cannot breathe — it is her north star', 'When they first met', 'When they are intimate'], answer: 1 },
          { question: 'What does he say about the home they will build?', options: ['It will be big', 'Not just a house — filled with shared memories, inside jokes, favorite things', 'It will be perfect', 'It will be cosy'], answer: 1 },
          { question: 'What does he say about the version of him she brings out?', options: ['She made him better', 'Before her, he did not know he could be this soft, this patient — she just believed it was possible', 'She inspires him', 'She completes him'], answer: 1 }
        ]
      },
      // fantasies — single story page (sectionIdx -1 = page-level quiz, appended at end)
      {
        id: 'fantasies-story', page: 'fantasies', sectionIdx: -1, title: 'Fantasies — The Story',
        questions: [
          { question: 'What is the hero title of this story?', options: ['ASH', '100 paragraphs', 'Love', 'Dreams'], answer: 0 },
          { question: 'The dedication warns these pages are for whose eyes only?', options: ['Everyone\'s', '\'s — "For Your Eyes Only"', 'The author\'s', 'No one\'s'], answer: 1 },
          { question: 'What happens when their skin finally meets, according to "The Fire & Our Skin"?', options: ['All the rules break down', 'The world disappears', 'They speak softly', 'Nothing changes'], answer: 0 },
          { question: 'What does he say turns him on more than anything in the world?', options: ['Watching her undress — the slow way', 'Her laughter', 'Her voice', 'Her perfume'], answer: 0 },
          { question: 'Where do these fantasies bloom, according to the dedication?', options: ['In the dark, quiet hours', 'In his diary', 'In dreams', 'In songs'], answer: 0 },
          { question: 'What is this story "never meant to be"?', options: ['Forgotten', 'Shared', 'Finished', 'Written'], answer: 0 }
        ]
      },
      // photo-gallery — page-level quiz
      {
        id: 'photo-gallery-quiz', page: 'photo-gallery', sectionIdx: -1, title: 'Photo Gallery',
        questions: [
          { question: 'What is the main purpose of this gallery?', options: ['To show off photography', 'To preserve memories', 'For social media', 'For fun'], answer: 1 },
          { question: 'What makes this gallery special?', options: ['The filters used', 'The personal meaning behind each photo', 'The resolution', 'The number of photos'], answer: 1 },
          { question: 'What was the creator trying to build instead of just another website?', options: ['A portfolio', 'A home', 'A gallery', 'A blog'], answer: 1 },
          { question: 'What feeling does this gallery evoke?', options: ['Boredom', 'Nostalgia and warmth', 'Confusion', 'Indifference'], answer: 1 }
        ]
      },
      // sky-observatory — page-level quiz
      {
        id: 'sky-observatory-quiz', page: 'sky-observatory', sectionIdx: -1, title: 'Sky Observatory',
        questions: [
          { question: 'What can you change in the sky observatory?', options: ['The music', 'The sky', 'The text', 'The colors'], answer: 1 },
          { question: 'What appears in the sky at night?', options: ['Clouds', 'Stars', 'Rain', 'Snow'], answer: 1 },
          { question: 'What is this website called?', options: ['A love letter', 'Dreambox', 'A gallery', 'A diary'], answer: 1 },
          { question: 'What month did you first meet?', options: ['May', 'June', 'July', 'August'], answer: 1 },
          { question: 'What was the author trying to build with this website?', options: ['A business', 'A home', 'A game', 'A tool'], answer: 1 }
        ]
      }
    ];
  }

  function getQuizForSection(page, idx) {
    for (var i = 0; i < QUIZZES.length; i++) {
      if (QUIZZES[i].page === page && QUIZZES[i].sectionIdx === idx) return QUIZZES[i];
    }
    return null;
  }

  window.addSectionQuizBtn = function (content, page, sectionIdx) {
    if (content.querySelector('.section-quiz-btn')) return;
    var quiz = getQuizForSection(page, sectionIdx);
    if (!quiz) return;
    var btn = document.createElement('button');
    btn.className = 'section-quiz-btn';
    btn.textContent = '\uD83E\uDDEA Quiz (' + quiz.questions.length + ' questions)';
    btn.style.cssText = 'display:block;margin:.75rem auto .5rem;padding:.6rem 1.2rem;border-radius:8px;background:rgba(111,207,147,.08);border:1px solid rgba(111,207,147,.25);color:#6fcf93;font-family:Fraunces,Georgia,serif;font-size:.82rem;cursor:pointer;transition:all .25s;';
    btn.onmouseover = function () { this.style.background = '#6fcf93'; this.style.color = '#181214'; };
    btn.onmouseout = function () { this.style.background = 'rgba(111,207,147,.08)'; this.style.color = '#6fcf93'; };
    btn.onclick = function () { openQuizModal(quiz); };
    var requestBtn = content.querySelector('.section-request-btn');
    if (requestBtn) content.insertBefore(btn, requestBtn);
    else {
      var lastTribute = content.querySelector('.tribute:last-of-type');
      if (lastTribute) lastTribute.after(btn);
      else content.appendChild(btn);
    }
  };

  function addQuizButtons() {
    var groups = document.querySelectorAll('.accordion-group');
    groups.forEach(function (g, idx) {
      var quiz = getQuizForSection(PAGE, idx);
      if (!quiz) return;
      var content = g.querySelector('.accordion-content');
      if (!content) return;
      if (content.querySelector('.section-quiz-btn')) return; // already added
      var btn = document.createElement('button');
      btn.className = 'section-quiz-btn';
      btn.textContent = '\uD83E\uDDEA Quiz (' + quiz.questions.length + ' questions)';
      btn.style.cssText = 'display:block;margin:1rem auto .5rem;padding:.6rem 1.2rem;border-radius:8px;background:rgba(111,207,147,.08);border:1px solid rgba(111,207,147,.25);color:#6fcf93;font-family:Fraunces,Georgia,serif;font-size:.82rem;cursor:pointer;transition:all .25s;';
      btn.onmouseover = function () { this.style.background = '#6fcf93'; this.style.color = '#181214'; };
      btn.onmouseout = function () { this.style.background = 'rgba(111,207,147,.08)'; this.style.color = '#6fcf93'; };
      btn.onclick = function () { openQuizModal(quiz); };
      var requestBtn = content.querySelector('.section-request-btn');
      if (requestBtn) content.insertBefore(btn, requestBtn);
      else {
        var lastTribute = content.querySelector('.tribute:last-of-type');
        if (lastTribute) lastTribute.after(btn);
        else content.appendChild(btn);
      }
    });
    // Page-level quiz for pages without accordion sections (e.g. fantasies)
    if (!groups.length) {
      var pageQuiz = getQuizForSection(PAGE, -1);
      if (!pageQuiz) return;
      var host = document.querySelector('article.page, main') || document.body;
      if (!host || host.querySelector('.section-quiz-btn')) return;
      var pbtn = document.createElement('button');
      pbtn.className = 'section-quiz-btn';
      pbtn.textContent = '\uD83E\uDDEA Quiz (' + pageQuiz.questions.length + ' questions)';
      pbtn.style.cssText = 'display:block;margin:2rem auto;padding:.6rem 1.2rem;border-radius:8px;background:rgba(111,207,147,.08);border:1px solid rgba(111,207,147,.25);color:#6fcf93;font-family:Fraunces,Georgia,serif;font-size:.82rem;cursor:pointer;transition:all .25s;';
      pbtn.onmouseover = function () { this.style.background = '#6fcf93'; this.style.color = '#181214'; };
      pbtn.onmouseout = function () { this.style.background = 'rgba(111,207,147,.08)'; this.style.color = '#6fcf93'; };
      pbtn.onclick = function () { openQuizModal(pageQuiz); };
      host.appendChild(pbtn);
    }
  }

  function openQuizModal(quiz) {
    var questions = quiz.questions || [];
    var html = '<div style="max-height:70vh;overflow-y:auto;padding:0 .25rem;">';
    html += '<h2 style="margin:0 0 .75rem;color:#ffe680;font-size:1.1rem;">' + esc(quiz.title || 'Quiz') + '</h2>';
    html += '<p style="color:#6b5f52;font-size:.75rem;margin:0 0 1rem;">' + questions.length + ' question' + (questions.length !== 1 ? 's' : '') + '</p>';
    questions.forEach(function (q, qi) {
      html += '<div style="margin-bottom:1.2rem;padding:.6rem .75rem;border-radius:6px;background:rgba(255,220,160,.03);border:1px solid rgba(255,210,150,.06);">';
      html += '<p style="margin:0 0 .5rem;color:#ffebd2;font-size:.85rem;font-weight:600;">' + (qi + 1) + '. ' + esc(q.question) + '</p>';
      var options = q.options || [];
      options.forEach(function (opt, oi) {
        var inputId = 'quiz-' + qi + '-' + oi;
        html += '<label style="display:flex;align-items:center;gap:6px;padding:3px 0;color:#c2b5a0;font-size:.82rem;cursor:pointer;">' +
          '<input type="radio" name="quiz-q-' + qi + '" value="' + oi + '" id="' + inputId + '">' +
          esc(opt) + '</label>';
      });
      html += '</div>';
    });
    html += '<button id="quizSubmitBtn" style="display:block;width:100%;padding:.55rem;border-radius:6px;background:rgba(111,207,147,.1);border:1px solid rgba(111,207,147,.3);color:#6fcf93;font-family:Fraunces,Georgia,serif;font-size:.9rem;cursor:pointer;">Submit</button>';
    html += '</div>';
    openModal(html);
    document.getElementById('quizSubmitBtn').addEventListener('click', function () { submitQuiz(quiz); });
  }

  function submitQuiz(quiz) {
    var questions = quiz.questions || [];
    var score = 0;
    var answers = [];
    questions.forEach(function (q, qi) {
      var selected = document.querySelector('input[name="quiz-q-' + qi + '"]:checked');
      var chosen = selected ? parseInt(selected.value) : -1;
      if (chosen === q.answer) score++;
      answers.push({
        question: q.question,
        chosen: chosen >= 0 && chosen < q.options.length ? q.options[chosen] : '(no answer)',
        correct: q.options[q.answer],
        isCorrect: chosen === q.answer
      });
    });
    var total = questions.length;
    var passed = score >= Math.ceil(total / 2);
    var html = '<div style="text-align:center;padding:1rem;">';
    html += '<div style="font-size:3rem;margin-bottom:.5rem;">' + (passed ? '\u2705' : '\u274C') + '</div>';
    html += '<h2 style="margin:0 0 .5rem;color:#ffe680;font-size:1.2rem;">' + (passed ? 'Passed!' : 'Keep Trying') + '</h2>';
    html += '<p style="font-size:1.1rem;color:#ffebd2;margin:0 0 .25rem;">' + score + ' / ' + total + '</p>';
    html += '<p style="color:#6b5f52;font-size:.8rem;margin:0 0 1rem;">' + (passed ? 'Great job!' : 'You need ' + Math.ceil(total / 2) + ' to pass.') + '</p>';
    html += '<div style="text-align:left;margin-bottom:1rem;">';
    answers.forEach(function (a, i) {
      var icon = a.isCorrect ? '\u2705' : '\u274C';
      var chosenClass = a.isCorrect ? 'color:#6fcf93;' : 'color:#e85d3a;';
      html += '<div style="padding:.4rem .5rem;margin-bottom:4px;border-radius:4px;background:rgba(255,220,160,.03);font-size:.8rem;line-height:1.4;">';
      html += '<div style="color:#ffebd2;font-weight:500;">' + (i + 1) + '. ' + esc(a.question) + '</div>';
      html += '<div style="' + chosenClass + '">' + icon + ' You: ' + esc(a.chosen) + '</div>';
      if (!a.isCorrect) html += '<div style="color:#6fcf93;">\u2705 Correct: ' + esc(a.correct) + '</div>';
      html += '</div>';
    });
    html += '</div>';
    html += '<div style="display:flex;gap:.5rem;justify-content:center;">';
    html += '<button onclick="closeModal()" style="padding:.5rem 1rem;border-radius:6px;background:rgba(255,230,128,.1);border:1px solid #ffe680;color:#ffe680;cursor:pointer;font-size:.85rem;">Close</button>';
    html += '<button id="retakeBtn" style="padding:.5rem 1rem;border-radius:6px;background:rgba(111,207,147,.1);border:1px solid rgba(111,207,147,.3);color:#6fcf93;cursor:pointer;font-size:.85rem;">\u21BB Retake</button>';
    html += '</div>';
    html += '</div>';
    openModal(html);
    var retakeBtn = document.getElementById('retakeBtn');
    if (retakeBtn) retakeBtn.onclick = function () { closeModal(); openQuizModal(quiz); };

    FB.get('quizHistory', 'all').then(function (d) {
      var items = d && d.items ? d.items : [];
      var key = quiz.id + '-' + Date.now();
      if (USED_KEYS[key]) return;
      USED_KEYS[key] = true;
      items.push({ quizId: quiz.id, score: score, total: total, passed: passed, answers: answers, timestamp: Date.now() });
      FB.put('quizHistory', { id: 'all', items: items }).catch(function () {});
      if (window.Interactions) window.Interactions.record('content', passed ? 'quiz_passed' : 'quiz_failed', quiz.id);
    }).catch(function () {});

    if (passed && quiz.page) {
      if (quiz.sectionIdx >= 0) {
        FB.get('sectionUnlock', quiz.page).then(function (d) {
          var cur = d && typeof d.unlocked === 'number' ? d.unlocked : 0;
          var next = quiz.sectionIdx + 1;
          if (next > cur) {
            return FB.put('sectionUnlock', { id: quiz.page, unlocked: next });
          }
        }).then(function () {
          toastShow('Section unlocked! Reloading...');
          setTimeout(function () { location.reload(); }, 1200);
        }).catch(function () {});
      } else {
        FB.get('config', 'access').then(function (ac) {
          ac = ac || {};
          if (!ac[quiz.page]) ac[quiz.page] = {};
          ac[quiz.page].adminLocked = false;
          ac.id = 'access';
          try {
            var local = JSON.parse(localStorage.getItem('ash-section-access') || '{}');
            local[quiz.page] = local[quiz.page] || {};
            local[quiz.page].adminLocked = false;
            localStorage.setItem('ash-section-access', JSON.stringify(local));
          } catch (e) {}
          return FB.put('config', ac);
        }).then(function () {
          toastShow('Section unlocked! Reloading...');
          setTimeout(function () { location.reload(); }, 1200);
        }).catch(function () {});
      }
    }
  }

  function esc(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function toastShow(msg) {
    var t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:rgba(24,18,20,.92);color:#ffebd2;padding:.6rem 1.2rem;border-radius:8px;font-size:.85rem;z-index:99999;border:1px solid rgba(255,210,150,.12);transition:opacity .3s;';
    t.style.opacity = '1';
    if (window._toastTimer) clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(function () { t.style.opacity = '0'; }, 3000);
  }

  function openModal(html) {
    var overlay = document.getElementById('modalOverlay');
    var content = document.getElementById('modalContent');
    if (!overlay || !content) {
      overlay = document.createElement('div'); overlay.className = 'modal-overlay'; overlay.id = 'modalOverlay';
      content = document.createElement('div'); content.className = 'modal'; content.id = 'modalContent';
      overlay.appendChild(content); document.body.appendChild(overlay);
    }
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;z-index:99998;';
    content.style.cssText = 'background:#1e1819;border:1px solid rgba(255,210,150,.12);border-radius:12px;padding:1.5rem;max-width:480px;width:90%;max-height:80vh;overflow-y:auto;';
    content.innerHTML = html;
    overlay.onclick = function (e) { if (e.target === overlay) closeModal(); };
  }

  window.closeModal = window.closeModal || function () {
    var overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.style.display = 'none';
  };

  window.openSectionQuiz = function (pageKey) {
    for (var i = 0; i < QUIZZES.length; i++) {
      if (QUIZZES[i].page === pageKey && QUIZZES[i].sectionIdx === -1) {
        openQuizModal(QUIZZES[i]);
        return;
      }
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(addQuizButtons, 500); });
  else setTimeout(addQuizButtons, 500);
})();
