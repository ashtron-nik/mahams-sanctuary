/**
 * random-constellations.js — 100+ handcrafted constellation patterns.
 * Not tied to skies; generates a random constellation each time.
 * Collection journal included.
 */
(function () {
  'use strict';
  if (window.FeatureFlags && !window.FeatureFlags.get('constellations')) return;

  var KEY = 'ash-constellations';
  var data;
  function load() { try { data = JSON.parse(localStorage.getItem(KEY)) || {}; } catch(e){ data={}; } if(!data.seen) data={seen:{},total:0,favorite:''}; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch(e){} }

  /* Each constellation: {id, name, lore, stars:[{x,y}], rarity, animation, brightness} */
  function P(x,y){ return {x:x,y:y}; }

  var CONSTELLATIONS = [
    {id:'c1',name:'The Dragon Heart', lore:'A heart of a star-dragon, still burning.', stars:[P(50,30),P(55,25),P(60,30),P(55,35),P(50,35),P(50,30),P(45,20),P(40,15),P(62,20),P(67,15)], rarity:'common', anim:'pulse', bright:0.7},
    {id:'c2',name:'The Rose', lore:'A rose that bloomed from starlight.', stars:[P(50,40),P(45,35),P(40,30),P(42,25),P(48,28),P(55,25),P(58,30),P(60,35),P(55,40),P(50,45),P(45,40)], rarity:'common', bright:0.6},
    {id:'c3',name:'The Moon', lore:'A crescent moon carried by the sky.', stars:[P(40,20),P(38,25),P(36,30),P(35,35),P(36,40),P(38,45),P(42,48),P(46,50),P(50,50),P(54,48),P(58,45),P(60,40),P(62,35),P(63,30),P(62,25),P(60,20),P(58,18),P(54,16),P(50,15),P(46,16),P(42,18)], rarity:'common', bright:0.8},
    {id:'c4',name:'The Book', lore:'An open book written in stars.', stars:[P(35,35),P(35,45),P(45,48),P(50,42),P(55,48),P(65,45),P(65,35),P(55,32),P(50,38),P(45,32),P(35,35),P(65,35)], rarity:'common', bright:0.6},
    {id:'c5',name:'The Lantern', lore:'A lantern that guides lost souls home.', stars:[P(50,25),P(45,30),P(45,40),P(42,45),P(42,50),P(58,50),P(58,45),P(55,40),P(55,30),P(50,25),P(50,55),P(48,58),P(52,58)], rarity:'common', anim:'float', bright:0.7},
    {id:'c6',name:'The Butterfly', lore:'A celestial butterfly with wings of light.', stars:[P(50,35),P(42,28),P(35,25),P(32,30),P(36,35),P(42,35),P(50,35),P(58,35),P(64,35),P(68,30),P(65,25),P(58,28),P(50,40),P(46,45),P(50,48),P(54,45),P(50,40)], rarity:'common', anim:'flutter', bright:0.7},
    {id:'c7',name:'The Bird', lore:'A bird that migrates between stars.', stars:[P(45,35),P(40,30),P(35,25),P(38,22),P(42,25),P(48,28),P(45,35),P(50,38),P(55,40),P(60,38),P(62,35),P(58,32)], rarity:'common', anim:'fly', bright:0.6},
    {id:'c8',name:'The Tree', lore:'The world tree, rooted in stardust.', stars:[P(50,50),P(48,40),P(45,30),P(48,20),P(52,20),P(55,30),P(52,40),P(50,50),P(42,35),P(38,30),P(35,25),P(58,35),P(62,30),P(65,25)], rarity:'common', bright:0.6},
    {id:'c9',name:'The Cat', lore:'A feline that walks among the stars.', stars:[P(50,30),P(45,25),P(38,23),P(35,27),P(38,30),P(45,30),P(50,30),P(55,32),P(60,35),P(62,38),P(58,40),P(52,38),P(50,35)], rarity:'common', bright:0.5},
    {id:'c10',name:'The Phoenix', lore:'Rising from stellar ashes.', stars:[P(50,50),P(48,42),P(45,35),P(42,28),P(38,22),P(35,18),P(42,15),P(48,18),P(50,25),P(52,18),P(58,15),P(65,18),P(62,22),P(58,28),P(55,35),P(52,42),P(50,50),P(48,45),P(52,45)], rarity:'uncommon', anim:'fly', bright:0.8},
    {id:'c11',name:'The Wolf', lore:'A lone wolf howling at the cosmic moon.', stars:[P(50,30),P(45,25),P(40,22),P(35,25),P(32,30),P(35,35),P(38,40),P(42,42),P(48,40),P(50,38),P(52,35),P(54,30),P(50,30),P(45,32),P(48,35)], rarity:'uncommon', bright:0.7},
    {id:'c12',name:'The Galaxy', lore:'A spiral galaxy in miniature.', stars:[P(50,35),P(42,30),P(35,28),P(30,35),P(35,42),P(42,40),P(50,45),P(58,40),P(65,42),P(70,35),P(65,28),P(58,30),P(50,35),P(38,33),P(45,33),P(55,33),P(62,33),P(50,28),P(50,42)], rarity:'rare', bright:0.9},
    {id:'c13',name:'The Infinity', lore:'Endless, like love.', stars:[P(40,30),P(35,35),P(35,40),P(40,45),P(45,42),P(50,35),P(55,42),P(60,45),P(65,40),P(65,35),P(60,30),P(55,28),P(50,35),P(45,28),P(40,30)], rarity:'uncommon', bright:0.7},
    {id:'c14',name:'The Compass', lore:'Always pointing home.', stars:[P(50,25),P(50,45),P(30,35),P(70,35),P(50,35),P(42,28),P(58,28),P(42,42),P(58,42)], rarity:'common', bright:0.6},
    {id:'c15',name:'Butterfly Wings', lore:'The wings of creation.', stars:[P(50,35),P(35,20),P(28,15),P(22,22),P(25,30),P(32,32),P(50,35),P(65,20),P(72,15),P(78,22),P(75,30),P(68,32),P(50,45),P(44,50),P(50,55),P(56,50),P(50,45)], rarity:'uncommon', bright:0.7},
    {id:'c16',name:'The Mountain', lore:'A peak that touches the heavens.', stars:[P(50,45),P(40,35),P(35,30),P(30,25),P(28,20),P(32,18),P(38,22),P(42,28),P(50,18),P(58,28),P(62,22),P(68,18),P(72,20),P(70,25),P(65,30),P(60,35),P(50,45)], rarity:'common', bright:0.5},
    {id:'c17',name:'The Castle', lore:'A fortress in the sky.', stars:[P(35,35),P(35,20),P(42,20),P(42,25),P(45,20),P(55,20),P(58,25),P(58,20),P(65,20),P(65,35),P(60,40),P(55,35),P(55,28),P(50,28),P(50,35),P(45,35),P(45,28),P(40,28),P(40,35),P(35,35)], rarity:'uncommon', bright:0.6},
    {id:'c18',name:'The Violin', lore:'Music of the spheres.', stars:[P(45,20),P(42,25),P(40,30),P(38,35),P(36,40),P(35,45),P(40,45),P(45,42),P(50,38),P(55,35),P(58,30),P(55,28),P(52,25),P(50,22),P(48,20)], rarity:'uncommon', bright:0.7},
    {id:'c19',name:'Ocean Wave', lore:'A wave frozen in starlight.', stars:[P(20,45),P(30,38),P(40,45),P(50,35),P(60,42),P(70,32),P(80,40),P(30,42),P(50,40),P(60,38),P(40,40),P(70,36)], rarity:'common', bright:0.5},
    {id:'c20',name:'The Key', lore:'Unlocks the door between worlds.', stars:[P(55,20),P(58,25),P(60,30),P(58,35),P(55,40),P(52,45),P(45,40),P(40,38),P(35,35),P(38,32),P(42,30),P(45,28),P(48,25),P(50,22),P(55,20)], rarity:'uncommon', bright:0.7},
    {id:'c21',name:'The Crown', lore:'Worn by the queen of stars.', stars:[P(35,25),P(40,20),P(45,18),P(50,15),P(55,18),P(60,20),P(65,25),P(62,30),P(58,28),P(55,25),P(50,28),P(45,25),P(42,28),P(38,30),P(35,25)], rarity:'rare', bright:0.8},
    {id:'c22',name:'The Feather', lore:'A feather from an angel\'s wing.', stars:[P(50,20),P(48,25),P(46,30),P(44,35),P(42,40),P(40,45),P(45,46),P(50,44),P(55,42),P(58,38),P(56,33),P(54,28),P(52,23),P(50,20)], rarity:'common', bright:0.6},
    {id:'c23',name:'The Dreamcatcher', lore:'Catches dreams between the stars.', stars:[P(50,25),P(35,30),P(30,40),P(35,50),P(50,55),P(65,50),P(70,40),P(65,30),P(50,25),P(42,35),P(50,40),P(58,35),P(50,25),P(38,38),P(62,38)], rarity:'rare', bright:0.8},
    {id:'c24',name:'Flower Garden', lore:'A garden that blooms under starlight.', stars:[P(30,40),P(35,35),P(40,38),P(42,30),P(48,35),P(50,28),P(55,33),P(60,30),P(65,38),P(70,35),P(50,45),P(45,48),P(50,52),P(55,48),P(50,45),P(35,42),P(65,42)], rarity:'uncommon', bright:0.7},
    {id:'c25',name:'The Hourglass', lore:'Time slipping through the cosmos.', stars:[P(45,20),P(55,20),P(58,25),P(55,30),P(45,30),P(42,25),P(45,20),P(45,30),P(42,35),P(45,40),P(55,40),P(58,35),P(55,30),P(50,30),P(50,32)], rarity:'uncommon', anim:'pulse', bright:0.6},
    {id:'c26',name:'The Angel', lore:'A guardian watching from above.', stars:[P(50,25),P(45,30),P(40,28),P(38,22),P(42,18),P(48,20),P(50,25),P(52,20),P(58,18),P(62,22),P(60,28),P(55,30),P(50,35),P(45,40),P(50,45),P(55,40),P(50,35)], rarity:'rare', bright:0.8},
    {id:'c27',name:'The Fox', lore:'A clever fox, swift and silent.', stars:[P(55,28),P(50,25),P(45,22),P(40,25),P(38,30),P(40,35),P(45,38),P(50,40),P(55,38),P(58,35),P(60,30),P(55,28),P(48,30),P(52,32),P(55,30)], rarity:'uncommon', bright:0.6},
    {id:'c28',name:'The Rabbit', lore:'A rabbit that hops between moons.', stars:[P(50,35),P(45,30),P(40,28),P(38,32),P(40,36),P(45,38),P(50,40),P(55,38),P(58,35),P(60,30),P(55,28),P(50,30),P(48,33),P(52,33),P(50,35),P(45,35)], rarity:'common', bright:0.5},
    {id:'c29',name:'The Whale', lore:'A great whale swimming the cosmic ocean.', stars:[P(30,35),P(38,30),P(50,28),P(62,30),P(70,35),P(72,40),P(68,45),P(58,42),P(50,45),P(42,42),P(35,45),P(30,40),P(30,35),P(40,35),P(60,35),P(50,35)], rarity:'rare', bright:0.7},
    {id:'c30',name:'The Ship', lore:'A vessel sailing the starry sea.', stars:[P(35,35),P(40,30),P(50,28),P(60,30),P(65,35),P(60,38),P(55,35),P(45,35),P(40,38),P(35,35),P(50,28),P(50,38),P(42,32),P(58,32)], rarity:'uncommon', bright:0.7},
    {id:'c31',name:'The Umbrella', lore:'Shelter from cosmic rain.', stars:[P(50,35),P(40,28),P(35,22),P(38,18),P(45,20),P(50,15),P(55,20),P(62,18),P(65,22),P(60,28),P(50,35),P(50,40),P(48,45),P(52,45)], rarity:'common', bright:0.5},
    {id:'c32',name:'The Owl', lore:'A wise owl that sees through the dark.', stars:[P(50,30),P(42,25),P(38,22),P(42,18),P(48,20),P(50,25),P(52,20),P(58,18),P(62,22),P(58,25),P(50,30),P(45,33),P(40,35),P(45,38),P(50,40),P(55,38),P(60,35),P(55,33)], rarity:'uncommon', bright:0.7},
    {id:'c33',name:'The Hummingbird', lore:'The smallest bird, the brightest light.', stars:[P(50,35),P(44,30),P(38,28),P(35,32),P(40,36),P(46,38),P(50,40),P(54,38),P(60,36),P(65,32),P(62,28),P(56,30),P(50,35),P(48,38),P(52,38)], rarity:'uncommon', anim:'flutter', bright:0.7},
    {id:'c34',name:'Paper Plane', lore:'A folded dream sent into the sky.', stars:[P(35,35),P(42,30),P(50,28),P(58,30),P(65,35),P(58,32),P(50,30),P(42,32),P(35,35)], rarity:'common', bright:0.5},
    {id:'c35',name:'The Stairway', lore:'A staircase to the stars.', stars:[P(30,45),P(35,40),P(40,35),P(45,30),P(50,25),P(55,20),P(60,15),P(35,42),P(45,32),P(55,22)], rarity:'common', bright:0.5},
    {id:'c36',name:'The Bridge', lore:'A bridge connecting two hearts.', stars:[P(25,35),P(35,30),P(45,28),P(55,28),P(65,30),P(75,35),P(65,32),P(55,30),P(45,30),P(35,32),P(25,35),P(45,22),P(55,22)], rarity:'common', bright:0.6},
    {id:'c37',name:'The Crown of Thorns', lore:'Beauty forged in hardship.', stars:[P(50,20),P(40,22),P(35,28),P(38,32),P(42,30),P(45,25),P(50,22),P(55,25),P(58,30),P(62,32),P(65,28),P(60,22),P(50,20),P(48,28),P(52,28)], rarity:'rare', bright:0.8},
    {id:'c38',name:'The Lovers', lore:'Two souls intertwined forever.', stars:[P(40,30),P(38,25),P(42,22),P(46,25),P(44,30),P(40,35),P(50,35),P(46,30),P(50,25),P(54,22),P(58,25),P(56,30),P(60,35),P(50,40),P(48,38),P(52,38),P(45,30),P(55,30)], rarity:'uncommon', anim:'pulse', bright:0.7},
    {id:'c39',name:'The Ring', lore:'A circle of eternal devotion.', stars:[P(50,25),P(40,30),P(35,38),P(38,46),P(45,50),P(55,50),P(62,46),P(65,38),P(60,30),P(50,25),P(42,33),P(58,33),P(50,42)], rarity:'uncommon', bright:0.7},
    {id:'c40',name:'The Starfall', lore:'Where stars go to rest.', stars:[P(30,20),P(38,25),P(45,30),P(50,35),P(55,40),P(60,45),P(65,48),P(35,30),P(42,35),P(48,40),P(52,45),P(58,48),P(40,40),P(50,45)], rarity:'common', bright:0.6},
    {id:'c41',name:'The Guardian', lore:'An ancient protector of the night sky.', stars:[P(50,20),P(45,25),P(42,30),P(40,35),P(42,40),P(48,45),P(50,42),P(52,45),P(58,40),P(60,35),P(58,30),P(55,25),P(50,20),P(45,32),P(55,32)], rarity:'rare', bright:0.8},
    {id:'c42',name:'The Harp', lore:'The instrument of celestial harmony.', stars:[P(35,20),P(32,25),P(30,30),P(30,35),P(32,40),P(35,45),P(40,40),P(45,35),P(50,30),P(55,35),P(60,40),P(65,45),P(68,40),P(70,35),P(70,30),P(68,25),P(65,20)], rarity:'uncommon', bright:0.6},
    {id:'c43',name:'The Shield', lore:'A barrier against the void.', stars:[P(50,25),P(35,30),P(30,40),P(35,50),P(50,55),P(65,50),P(70,40),P(65,30),P(50,25),P(42,35),P(58,35),P(50,45)], rarity:'common', bright:0.6},
    {id:'c44',name:'The Telescope', lore:'Gazing deeper into the unknown.', stars:[P(35,40),P(40,35),P(45,30),P(50,25),P(55,22),P(60,20),P(65,25),P(62,28),P(58,30),P(55,32),P(50,35),P(45,38)], rarity:'common', bright:0.5},
    {id:'c45',name:'The Arrow', lore:'Aimed straight at the heart.', stars:[P(25,45),P(35,40),P(45,35),P(55,30),P(65,25),P(75,20),P(60,28),P(62,32),P(68,28),P(65,22)], rarity:'common', bright:0.5},
    {id:'c46',name:'The Bell', lore:'Ringing through eternity.', stars:[P(50,25),P(42,28),P(38,32),P(40,38),P(45,42),P(55,42),P(60,38),P(62,32),P(58,28),P(50,25),P(50,45),P(48,48),P(52,48),P(50,45)], rarity:'uncommon', bright:0.7},
    {id:'c47',name:'The Mask', lore:'Worn at the cosmic masquerade.', stars:[P(50,25),P(40,28),P(35,35),P(38,40),P(42,38),P(50,35),P(58,38),P(62,40),P(65,35),P(60,28),P(50,25),P(45,32),P(55,32)], rarity:'rare', bright:0.7},
    {id:'c48',name:'The Flame', lore:'A fire that never dies.', stars:[P(50,30),P(46,28),P(42,25),P(40,22),P(45,20),P(50,18),P(55,20),P(60,22),P(58,25),P(54,28),P(50,30),P(48,35),P(52,35),P(50,40)], rarity:'common', bright:0.7},
    {id:'c49',name:'The Snowflake', lore:'Unique, like every soul.', stars:[P(50,30),P(40,20),P(35,15),P(42,18),P(48,22),P(50,30),P(52,22),P(58,18),P(65,15),P(60,20),P(50,30),P(45,35),P(40,40),P(50,30),P(55,35),P(60,40)], rarity:'uncommon', bright:0.8},
    {id:'c50',name:'The Compass Rose', lore:'Guiding travelers through the dark.', stars:[P(50,15),P(50,25),P(50,35),P(50,45),P(30,30),P(40,30),P(60,30),P(70,30),P(42,22),P(58,22),P(42,38),P(58,38)], rarity:'uncommon', bright:0.6},
    {id:'c51',name:'The Anchor', lore:'Holding fast against any storm.', stars:[P(50,20),P(48,25),P(48,35),P(50,40),P(52,35),P(52,25),P(50,20),P(42,28),P(58,28),P(50,45),P(45,48),P(55,48)], rarity:'common', bright:0.5},
    {id:'c52',name:'The Sword', lore:'A blade forged from collapsing stars.', stars:[P(50,15),P(48,22),P(46,30),P(44,38),P(42,45),P(40,50),P(46,48),P(50,46),P(54,48),P(58,50),P(56,45),P(54,38),P(52,30),P(50,22),P(50,15)], rarity:'uncommon', bright:0.7},
    {id:'c53',name:'The Scales', lore:'Justice balanced among the stars.', stars:[P(50,25),P(35,30),P(30,35),P(35,40),P(50,45),P(65,40),P(70,35),P(65,30),P(50,25),P(50,35),P(45,38),P(55,38)], rarity:'common', bright:0.5},
    {id:'c54',name:'The Spiral', lore:'The shape of the universe itself.', stars:[P(50,35),P(44,30),P(38,28),P(34,32),P(36,38),P(42,42),P(50,44),P(58,42),P(64,38),P(66,32),P(62,28),P(56,30),P(50,35),P(46,34),P(54,34)], rarity:'rare', bright:0.8},
    {id:'c55',name:'The Chalice', lore:'A cup filled with starlight.', stars:[P(50,22),P(42,25),P(38,30),P(38,35),P(42,40),P(50,42),P(58,40),P(62,35),P(62,30),P(58,25),P(50,22),P(50,45),P(48,48),P(52,48)], rarity:'uncommon', bright:0.7},
    {id:'c56',name:'The Nebula', lore:'A cloud where stars are born.', stars:[P(30,25),P(38,22),P(45,20),P(50,18),P(55,20),P(62,22),P(70,25),P(68,30),P(62,35),P(55,38),P(50,40),P(45,38),P(38,35),P(32,30),P(30,25),P(40,30),P(60,30)], rarity:'rare', bright:0.9},
    {id:'c57',name:'The Trail', lore:'A path of stars left behind.', stars:[P(20,45),P(28,40),P(36,35),P(44,30),P(52,25),P(60,20),P(68,15),P(76,10),P(70,18),P(62,22),P(54,28),P(46,32),P(38,38),P(30,42)], rarity:'common', bright:0.5},
    {id:'c58',name:'The Nest', lore:'Where star-birds raise their young.', stars:[P(50,35),P(40,30),P(35,25),P(38,20),P(45,22),P(50,18),P(55,22),P(62,20),P(65,25),P(60,30),P(50,35),P(45,30),P(55,30),P(50,28)], rarity:'uncommon', bright:0.6},
    {id:'c59',name:'The Gear', lore:'The machinery of the cosmos.', stars:[P(50,30),P(40,25),P(35,30),P(38,38),P(45,42),P(50,40),P(55,42),P(62,38),P(65,30),P(60,25),P(50,30),P(42,32),P(58,32),P(50,35)], rarity:'rare', bright:0.7},
    {id:'c60',name:'The Heartbeat', lore:'The pulse of the universe.', stars:[P(50,25),P(45,20),P(40,22),P(38,28),P(40,32),P(45,35),P(50,38),P(55,35),P(60,32),P(62,28),P(60,22),P(55,20),P(50,25),P(48,28),P(52,28)], rarity:'common', anim:'pulse', bright:0.7},
    {id:'c61',name:'The Eclipse', lore:'When two worlds become one.', stars:[P(50,25),P(40,30),P(35,38),P(38,45),P(45,48),P(55,48),P(62,45),P(65,38),P(60,30),P(50,25),P(48,32),P(52,32),P(50,40)], rarity:'rare', bright:0.8},
    {id:'c62',name:'The Arrowhead', lore:'A point of destiny.', stars:[P(40,35),P(45,30),P(50,20),P(55,30),P(60,35),P(50,45),P(48,38),P(52,38),P(50,45),P(45,32),P(55,32)], rarity:'common', bright:0.5},
    {id:'c63',name:'The Fountain', lore:'A geyser of liquid starlight.', stars:[P(50,25),P(45,30),P(40,35),P(35,40),P(40,38),P(45,36),P(50,34),P(55,36),P(60,38),P(65,40),P(60,35),P(55,30),P(50,25),P(50,45),P(48,42),P(52,42)], rarity:'uncommon', bright:0.7},
    {id:'c64',name:'The Diamond', lore:'A star compressed into perfection.', stars:[P(50,20),P(35,30),P(30,40),P(50,50),P(70,40),P(65,30),P(50,20),P(42,35),P(58,35),P(35,35),P(65,35)], rarity:'rare', bright:0.9},
    {id:'c65',name:'The Telescope Array', lore:'Many eyes watching the stars.', stars:[P(20,35),P(28,30),P(36,28),P(44,25),P(52,28),P(60,30),P(68,35),P(76,30),P(72,32),P(64,28),P(56,30),P(48,27),P(40,30),P(32,32)], rarity:'uncommon', bright:0.6},
    {id:'c66',name:'The Cradle', lore:'Where the first star was born.', stars:[P(50,25),P(42,30),P(35,35),P(38,40),P(45,42),P(55,42),P(62,40),P(65,35),P(58,30),P(50,25),P(50,32),P(45,38),P(55,38),P(48,48),P(52,48)], rarity:'rare', bright:0.8},
    {id:'c67',name:'The Vortex', lore:'A whirlpool of stars.', stars:[P(50,30),P(42,28),P(36,32),P(38,38),P(44,42),P(50,44),P(56,42),P(62,38),P(64,32),P(58,28),P(50,30),P(46,34),P(54,34),P(50,38)], rarity:'rare', bright:0.8},
    {id:'c68',name:'The Crossing', lore:'Where two paths meet.', stars:[P(30,35),P(40,30),P(50,25),P(60,30),P(70,35),P(50,25),P(50,35),P(50,45),P(45,32),P(55,32)], rarity:'common', bright:0.5},
    {id:'c69',name:'The Sundial', lore:'Marking time in starlight.', stars:[P(50,20),P(50,35),P(50,45),P(30,30),P(40,28),P(60,28),P(70,30),P(42,22),P(58,22)], rarity:'uncommon', bright:0.6},
    {id:'c70',name:'The Pendant', lore:'A charm worn by the night.', stars:[P(50,20),P(42,25),P(38,32),P(42,38),P(50,42),P(58,38),P(62,32),P(58,25),P(50,20),P(50,45),P(48,48),P(52,48)], rarity:'common', bright:0.6},
    {id:'c71',name:'The Knot', lore:'Tied by fate itself.', stars:[P(45,25),P(38,30),P(42,35),P(50,38),P(58,35),P(62,30),P(55,25),P(50,22),P(45,25),P(48,30),P(52,30),P(55,25)], rarity:'uncommon', bright:0.7},
    {id:'c72',name:'The Beanstalk', lore:'Reaching from earth to the heavens.', stars:[P(50,50),P(48,42),P(46,35),P(45,28),P(44,22),P(46,18),P(50,15),P(54,18),P(56,22),P(55,28),P(54,35),P(52,42),P(50,50)], rarity:'common', bright:0.5},
    {id:'c73',name:'The Compass Star', lore:'Points true north in any galaxy.', stars:[P(50,15),P(50,25),P(50,35),P(50,45),P(35,30),P(45,30),P(55,30),P(65,30)], rarity:'common', bright:0.5},
    {id:'c74',name:'The Triad', lore:'Three fates, one destiny.', stars:[P(30,35),P(38,30),P(46,28),P(50,35),P(54,28),P(62,30),P(70,35),P(62,38),P(54,40),P(50,42),P(46,40),P(38,38),P(30,35)], rarity:'uncommon', anim:'pulse', bright:0.7},
    {id:'c75',name:'The Horizon', lore:'Where earth meets the starry sea.', stars:[P(20,45),P(30,40),P(40,38),P(50,35),P(60,38),P(70,40),P(80,45),P(50,25),P(45,30),P(55,30)], rarity:'common', bright:0.5},
    {id:'c76',name:'The Pinnacle', lore:'The highest point of the sky.', stars:[P(50,15),P(45,22),P(40,28),P(35,35),P(38,40),P(45,42),P(50,38),P(55,42),P(62,40),P(65,35),P(60,28),P(55,22),P(50,15)], rarity:'common', bright:0.5},
    {id:'c77',name:'The Wheel', lore:'The cycle of the cosmos.', stars:[P(50,20),P(35,28),P(28,40),P(35,52),P(50,60),P(65,52),P(72,40),P(65,28),P(50,20),P(42,32),P(58,32),P(50,40),P(45,48),P(55,48)], rarity:'uncommon', bright:0.7},
    {id:'c78',name:'The Portal', lore:'A doorway to other worlds.', stars:[P(50,25),P(38,30),P(32,40),P(38,50),P(50,55),P(62,50),P(68,40),P(62,30),P(50,25),P(50,35),P(42,40),P(58,40),P(50,45)], rarity:'rare', bright:0.8},
    {id:'c79',name:'The Scepter', lore:'Held by the ruler of the night.', stars:[P(50,15),P(48,22),P(46,30),P(44,38),P(42,45),P(40,50),P(50,50),P(60,50),P(58,45),P(56,38),P(54,30),P(52,22),P(50,15)], rarity:'uncommon', bright:0.7},
    {id:'c80',name:'The Spark', lore:'Where creation began.', stars:[P(50,35),P(46,30),P(42,28),P(38,32),P(40,36),P(44,38),P(50,40),P(56,38),P(60,36),P(62,32),P(58,28),P(54,30),P(50,35)], rarity:'common', bright:0.6},
    {id:'c81',name:'The Sundew', lore:'A flower that eats stars.', stars:[P(50,25),P(40,28),P(35,35),P(38,42),P(45,45),P(55,45),P(62,42),P(65,35),P(60,28),P(50,25),P(48,32),P(52,32),P(50,38),P(46,35),P(54,35)], rarity:'rare', bright:0.8},
    {id:'c82',name:'The Mirage', lore:'A shimmer of light in the dark.', stars:[P(35,30),P(40,25),P(48,22),P(55,25),P(60,30),P(55,35),P(48,38),P(40,35),P(35,30),P(42,30),P(52,30),P(48,30)], rarity:'uncommon', bright:0.7},
    {id:'c83',name:'The Drifter', lore:'A star that never stays.', stars:[P(30,35),P(38,32),P(45,28),P(52,25),P(60,22),P(68,20),P(75,18),P(68,25),P(60,28),P(52,32),P(45,35),P(38,38),P(30,35)], rarity:'common', bright:0.5},
    {id:'c84',name:'The Monolith', lore:'A structure older than time.', stars:[P(45,20),P(45,30),P(45,40),P(45,50),P(55,20),P(55,30),P(55,40),P(55,50),P(50,25),P(50,35),P(50,45)], rarity:'rare', bright:0.7},
    {id:'c85',name:'The Echo', lore:'A sound reflected across space.', stars:[P(35,30),P(40,28),P(45,25),P(50,23),P(55,25),P(60,28),P(65,30),P(60,32),P(55,34),P(50,36),P(45,34),P(40,32),P(35,30)], rarity:'uncommon', bright:0.6},
    {id:'c86',name:'The Wisp', lore:'A guiding light in the dark.', stars:[P(40,20),P(38,25),P(36,30),P(38,35),P(42,38),P(48,40),P(55,38),P(60,35),P(62,30),P(60,25),P(58,20),P(55,23),P(52,25),P(48,27),P(45,25),P(42,23)], rarity:'common', bright:0.6},
    {id:'c87',name:'The Puzzle', lore:'A riddle written in stars.', stars:[P(35,25),P(42,22),P(48,20),P(55,22),P(62,25),P(55,28),P(48,30),P(42,28),P(35,25),P(40,32),P(50,35),P(60,32)], rarity:'rare', bright:0.7},
    {id:'c88',name:'The Bloom', lore:'A flower opening to the cosmos.', stars:[P(50,30),P(40,25),P(35,20),P(38,16),P(44,18),P(50,22),P(56,18),P(62,16),P(65,20),P(60,25),P(50,30),P(45,28),P(55,28),P(50,35),P(48,38),P(52,38)], rarity:'uncommon', bright:0.7},
    {id:'c89',name:'The Beacon', lore:'A light that never dims.', stars:[P(50,20),P(48,28),P(45,35),P(42,42),P(50,45),P(58,42),P(55,35),P(52,28),P(50,20),P(50,30),P(46,33),P(54,33)], rarity:'common', bright:0.7},
    {id:'c90',name:'The Oasis', lore:'Water in the desert of space.', stars:[P(50,30),P(40,32),P(35,38),P(40,44),P(50,46),P(60,44),P(65,38),P(60,32),P(50,30),P(50,38),P(45,40),P(55,40)], rarity:'uncommon', bright:0.6},
    {id:'c91',name:'The Tear', lore:'A drop of cosmic sorrow.', stars:[P(50,20),P(46,25),P(42,30),P(40,35),P(42,40),P(46,45),P(50,42),P(54,45),P(58,40),P(60,35),P(58,30),P(54,25),P(50,20),P(50,48),P(48,50),P(52,50)], rarity:'common', bright:0.6},
    {id:'c92',name:'The Carousel', lore:'Stars going round and round.', stars:[P(50,25),P(38,30),P(32,40),P(38,50),P(50,55),P(62,50),P(68,40),P(62,30),P(50,25),P(44,35),P(56,35),P(50,45)], rarity:'uncommon', bright:0.7},
    {id:'c93',name:'The Lens', lore:'Focusing the light of a thousand suns.', stars:[P(50,25),P(40,28),P(35,35),P(38,42),P(45,45),P(50,42),P(55,45),P(62,42),P(65,35),P(60,28),P(50,25),P(48,32),P(52,32)], rarity:'uncommon', bright:0.7},
    {id:'c94',name:'The Memory', lore:'A star that remembers.', stars:[P(50,30),P(44,26),P(38,24),P(34,28),P(36,34),P(42,36),P(50,38),P(58,36),P(64,34),P(66,28),P(62,24),P(56,26),P(50,30),P(48,32),P(52,32)], rarity:'common', bright:0.6},
    {id:'c95',name:'The Crest', lore:'A wave of frozen starlight.', stars:[P(30,40),P(38,35),P(45,30),P(52,28),P(60,30),P(68,35),P(75,40),P(68,38),P(60,34),P(52,32),P(45,34),P(38,38),P(30,40)], rarity:'common', bright:0.5},
    {id:'c96',name:'The Constellation of You', lore:'The most beautiful constellation in the sky.', stars:[P(50,30),P(45,32),P(55,32),P(48,28),P(52,28),P(50,35),P(44,36),P(56,36),P(50,40),P(46,42),P(54,42)], rarity:'mythic', anim:'pulse', bright:1.0},
    {id:'c97',name:'The Eternal Flame', lore:'A fire that has burned since the dawn of time.', stars:[P(50,25),P(44,22),P(38,25),P(36,30),P(40,35),P(46,38),P(50,42),P(54,38),P(60,35),P(64,30),P(62,25),P(56,22),P(50,25),P(48,30),P(52,30)], rarity:'legendary', bright:0.9},
    {id:'c98',name:'The Silver Thread', lore:'The thread that connects all souls.', stars:[P(15,45),P(25,38),P(35,32),P(45,28),P(55,28),P(65,32),P(75,38),P(85,45),P(75,42),P(65,36),P(55,32),P(45,32),P(35,36),P(25,42),P(15,45)], rarity:'legendary', bright:0.8},
    {id:'c99',name:'The Starforge', lore:'Where stars are born and die.', stars:[P(50,30),P(40,25),P(34,30),P(36,38),P(42,42),P(50,45),P(58,42),P(64,38),P(66,30),P(60,25),P(50,30),P(46,34),P(54,34),P(50,38),P(42,35),P(58,35)], rarity:'legendary', bright:0.9},
    {id:'c100',name:'The Lovers\' Knot', lore:'Two souls woven together by destiny.', stars:[P(45,30),P(40,25),P(38,32),P(42,38),P(48,40),P(50,35),P(52,40),P(58,38),P(62,32),P(60,25),P(55,30),P(50,25),P(45,30),P(50,35),P(48,32),P(52,32)], rarity:'mythic', anim:'pulse', bright:1.0}
  ];

  // Extra constellations beyond 100 (up to 110)
  var EXTRA = [
    {id:'c101',name:'The Prism', lore:'Light split into all its colors.', stars:[P(50,20),P(42,26),P(35,32),P(42,38),P(50,44),P(58,38),P(65,32),P(58,26),P(50,20),P(48,28),P(52,28),P(50,35)], rarity:'uncommon', bright:0.7},
    {id:'c102',name:'The Sundrop', lore:'A single drop of daylight.', stars:[P(50,20),P(44,25),P(40,30),P(42,36),P(48,38),P(50,35),P(52,38),P(58,36),P(60,30),P(56,25),P(50,20),P(50,42)], rarity:'common', bright:0.6},
    {id:'c103',name:'The Firebird', lore:'A bird of living flame.', stars:[P(50,35),P(44,30),P(38,25),P(42,22),P(48,24),P(50,28),P(52,24),P(58,22),P(62,25),P(56,30),P(50,35),P(46,40),P(50,45),P(54,40),P(50,35)], rarity:'legendary', anim:'fly', bright:0.9},
    {id:'c104',name:'The Ice Crown', lore:'A crown of frozen starlight.', stars:[P(50,18),P(40,22),P(35,30),P(38,36),P(44,38),P(50,35),P(56,38),P(62,36),P(65,30),P(60,22),P(50,18),P(46,28),P(54,28)], rarity:'rare', bright:0.8},
    {id:'c105',name:'The Deep', lore:'The abyss that stares back.', stars:[P(30,30),P(38,26),P(46,24),P(54,24),P(62,26),P(70,30),P(68,35),P(60,38),P(52,40),P(48,40),P(40,38),P(32,35),P(30,30)], rarity:'rare', bright:0.7},
    {id:'c106',name:'The Voyager', lore:'A traveler between the stars.', stars:[P(35,30),P(42,28),P(50,25),P(58,28),P(65,30),P(62,33),P(55,35),P(50,37),P(45,35),P(38,33),P(35,30)], rarity:'common', bright:0.5},
    {id:'c107',name:'The Reflector', lore:'A surface that mirrors the soul.', stars:[P(50,20),P(38,28),P(32,38),P(38,48),P(50,55),P(62,48),P(68,38),P(62,28),P(50,20),P(50,35),P(42,38),P(58,38)], rarity:'uncommon', bright:0.7},
    {id:'c108',name:'The Stillness', lore:'The quiet before creation.', stars:[P(35,30),P(42,28),P(50,25),P(58,28),P(65,30),P(62,35),P(55,38),P(50,40),P(45,38),P(38,35),P(35,30),P(50,32)], rarity:'common', bright:0.5},
    {id:'c109',name:'The Aurora Crown', lore:'A crown woven from northern lights.', stars:[P(50,15),P(40,20),P(34,28),P(32,35),P(38,40),P(46,42),P(54,42),P(62,40),P(68,35),P(66,28),P(60,20),P(50,15),P(44,28),P(56,28),P(50,35)], rarity:'legendary', bright:0.9},
    {id:'c110',name:'The Singularity', lore:'Where all paths converge.', stars:[P(50,35),P(45,30),P(40,28),P(36,32),P(38,38),P(44,42),P(50,44),P(56,42),P(62,38),P(64,32),P(60,28),P(55,30),P(50,35)], rarity:'mythic', bright:1.0}
  ];
  CONSTELLATIONS = CONSTELLATIONS.concat(EXTRA);

  /* ---------- Helpers ---------- */
  var rarityColors = { common:'#a0a080', uncommon:'#80a060', rare:'#6080c0', 'very-rare':'#c060a0', legendary:'#d4a020', mythic:'#ffe680' };
  function rand(min, max) { return Math.random()*(max-min)+min; }
  function genGenericStars() {
    var pts = [];
    for (var i = 0; i < 12; i++) {
      var t = (i / 12) * Math.PI * 2;
      var r = 15 + 20 * Math.abs(Math.sin(i * 2.3));
      pts.push(P(50 + r * Math.cos(t) / 2, 30 + r * Math.sin(t) / 2));
    }
    return pts;
  }

  /* ---------- Sky watcher ---------- */
  var currentConstellation = null;
  var animationFrame = null;

  function pickRandom() {
    var total = CONSTELLATIONS.length;
    // rarity weighting
    var weights = CONSTELLATIONS.map(function(c){
      var w = { common:50, uncommon:30, rare:15, legendary:5, mythic:1 };
      return w[c.rarity] || 10;
    });
    var sum = weights.reduce(function(a,b){ return a+b; }, 0);
    var r = Math.random() * sum;
    for (var i = 0; i < total; i++) {
      r -= weights[i];
      if (r <= 0) return CONSTELLATIONS[i];
    }
    return CONSTELLATIONS[0];
  }

  var watcherRunning = false;
  function startWatcher() {
    if (watcherRunning) return;
    watcherRunning = true;

    // only generate random constellation on pages WITHOUT sky-living.js
    // (sky-living.js calls __updateSkyConstellation directly)
    setTimeout(function(){
      var _sd;
      try { _sd = JSON.parse(localStorage.getItem('ash-sky-current-constellation')); } catch(e){}
      if (!_sd || !_sd.displayName) generateConstellation();
    }, 2000);
  }

  function generateConstellation() {
    var c = pickRandom();
    currentConstellation = c;
    recordDiscovery(c.id);
    var canvas = document.getElementById('constellationCanvas');
    if (canvas && canvas.style.display !== 'none') {
      renderConstellation(canvas, c);
    }
  }

  function skyPtsToStars(pts) {
    if (!pts || !pts.length) return genGenericStars();
    var xs = pts.map(function(p){return p[0];}), ys = pts.map(function(p){return p[1];});
    var minX = Math.min.apply(null,xs), maxX = Math.max.apply(null,xs);
    var minY = Math.min.apply(null,ys), maxY = Math.max.apply(null,ys);
    var rangeX = maxX - minX || 1, rangeY = maxY - minY || 1;
    return pts.map(function(p){
      return { x: 10 + (p[0]-minX)/rangeX * 50, y: 10 + (p[1]-minY)/rangeY * 40 };
    });
  }

  // called by sky-living.js when sky changes — direct sync, no polling
  window.__updateSkyConstellation = function(data) {
    if (!data || !data.displayName) return;
    currentConstellation = { id:'sky-sync', name: data.displayName, lore: data.message || '', stars: skyPtsToStars(data.pts), rarity: data.rarity || 'common', anim: 'pulse', bright: 0.8 };
    var canvas = document.getElementById('constellationCanvas');
    if (canvas && canvas.style.display !== 'none') renderConstellation(canvas, currentConstellation);
  };

  // initial sync: pick up sky-living data if already set
  try {
    var _sd = JSON.parse(localStorage.getItem('ash-sky-current-constellation'));
    if (_sd && _sd.displayName) window.__updateSkyConstellation(_sd);
  } catch(e){}

  function recordDiscovery(id) {
    load();
    if (!data.seen[id]) {
      data.seen[id] = { first: Date.now(), count: 1 };
    } else {
      data.seen[id].count++;
      // update last seen
    }
    data.total++;
    save();
  }

  /* ---------- Render ---------- */
  function renderConstellation(canvas, c) {
    if (!c) return;
    var ctx = canvas.getContext('2d');
    var W = 400, H = 300;
    canvas.width = W; canvas.height = H;
    ctx.clearRect(0, 0, W, H);

    // background stars
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    for (var i = 0; i < 80; i++) {
      var sx = Math.random()*W, sy = Math.random()*H;
      ctx.beginPath(); ctx.arc(sx, sy, 0.5+Math.random()*1, 0, Math.PI*2); ctx.fill();
    }

    // constellation stars
    var stars = c.stars;
    var scale = 1.8;
    var ox = (W - 60*scale)/2;
    var oy = (H - 50*scale)/2;

    // draw lines first
    ctx.strokeStyle = 'rgba(255,230,100,'+(0.3*c.bright)+')';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (var i = 0; i < stars.length; i++) {
      var px = ox+stars[i].x*scale, py = oy+stars[i].y*scale;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // glow
    ctx.shadowColor = 'rgba(255,230,100,0.4)';
    ctx.shadowBlur = 15;

    // draw star points
    var bright = c.bright || 0.7;
    for (var i = 0; i < stars.length; i++) {
      var px = ox+stars[i].x*scale, py = oy+stars[i].y*scale;
      var r = 1.5 + Math.random() * 0.5;
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(255,255,220,'+bright+')';
      ctx.fill();
    }

    ctx.shadowBlur = 0;

    // animation overlay
    if (c.anim) {
      animateConstellation(ctx, c, W, H, ox, oy, scale);
    }

    // name + lore
    ctx.fillStyle = 'rgba(255,230,100,0.7)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(c.name, W/2, 15);
    ctx.fillStyle = 'rgba(255,230,100,0.35)';
    ctx.font = '8px sans-serif';
    ctx.fillText(c.lore, W/2, 28);
  }

  function animateConstellation(ctx, c, W, H, ox, oy, scale) {
    var t = Date.now() / 1000;
    ctx.shadowBlur = 0;

    if (c.anim === 'pulse') {
      // pulsing glow
      var pulse = 0.3 + 0.3 * Math.sin(t * 2);
      var pr = 30 + 10 * Math.sin(t * 1.5);
      ctx.beginPath(); ctx.arc(W/2, H/2, pr, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(255,230,100,'+pulse+')';
      ctx.fill();
    } else if (c.anim === 'fly') {
      // moving spark
      var fx = W/2 + 20*Math.sin(t), fy = H/3 + 15*Math.cos(t*1.3);
      ctx.beginPath(); ctx.arc(fx, fy, 3, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(255,255,200,0.6)';
      ctx.shadowColor = 'rgba(255,230,100,0.5)';
      ctx.shadowBlur = 10;
      ctx.fill();
    } else if (c.anim === 'float') {
      // gentle bobbing
      var fy = 5 * Math.sin(t);
      ctx.beginPath(); ctx.arc(W/2, H/2+fy, 25, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(255,230,100,'+(0.1+0.1*Math.sin(t*2))+')';
      ctx.fill();
    } else if (c.anim === 'flutter') {
      // wing beats
      var fw = 5 * Math.abs(Math.sin(t*3));
      ctx.beginPath(); ctx.ellipse(W/2-15, H/2, 8+fw, 4, -0.3, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(255,142,180,0.2)'; ctx.fill();
      ctx.beginPath(); ctx.ellipse(W/2+15, H/2, 8+fw, 4, 0.3, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(255,142,180,0.2)'; ctx.fill();
    }
  }

  /* ---------- UI ---------- */
  function toggleView() {
    var existing = document.getElementById('constellationCanvas');
    if (existing && existing.style.display !== 'none') {
      existing.style.display = 'none';
      if (document.getElementById('constellationLabel')) document.getElementById('constellationLabel').style.display = 'none';
      return;
    }
    if (!existing) {
      existing = document.createElement('canvas');
      existing.id = 'constellationCanvas';
      existing.style.cssText = 'position:fixed;top:1rem;right:1rem;z-index:99997;border-radius:12px;background:rgba(0,0,0,0.5);cursor:pointer;width:200px;height:150px;';
      document.body.appendChild(existing);
      existing.addEventListener('click', openJournal);
    }
    existing.style.display = 'block';
    if (!document.getElementById('constellationLabel')) {
      var l = document.createElement('div');
      l.id = 'constellationLabel';
      l.style.cssText = 'position:fixed;top:154px;right:1rem;z-index:99997;font-size:9px;color:rgba(255,230,100,0.5);cursor:pointer;';
      l.textContent = 'Click to open journal';
      l.addEventListener('click', openJournal);
      document.body.appendChild(l);
    }
    document.getElementById('constellationLabel').style.display = 'block';
    if (currentConstellation) renderConstellation(existing, currentConstellation);
    else { existing.style.display = 'none'; }
  }

  /* ---------- Journal ---------- */
  function openJournal() {
    var existing = document.getElementById('constellationJournal');
    if (existing) { existing.remove(); return; }
    load();

    var overlay = document.createElement('div');
    overlay.id = 'constellationJournal';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:999999;background:rgba(10,8,6,0.85);backdrop-filter:blur(10px);display:flex;justify-content:center;align-items:center;';

    var panel = document.createElement('div');
    panel.style.cssText = 'background:rgba(20,16,12,0.95);border:1px solid rgba(255,230,100,0.2);border-radius:16px;padding:24px;max-width:500px;width:90%;max-height:80vh;overflow-y:auto;position:relative;color:#ffebd2;';

    var seen = Object.keys(data.seen).length;
    panel.innerHTML = '<div style="font-size:20px;font-weight:bold;color:#ffe680;margin-bottom:12px;">\uD83C\uDF1F Constellation Journal</div>'+
      '<div style="font-size:12px;color:#a09080;margin-bottom:12px;">Discovered '+seen+' / '+CONSTELLATIONS.length+' constellations</div>';

    // current view
    if (currentConstellation) {
      panel.innerHTML += '<div style="background:rgba(255,230,100,0.06);border:1px solid rgba(255,230,100,0.15);border-radius:8px;padding:10px;margin-bottom:12px;text-align:center;">'+
        '<div style="font-size:14px;font-weight:bold;">\u2728 '+currentConstellation.name+'</div>'+
        '<div style="font-size:11px;color:'+rarityColors[currentConstellation.rarity]+';text-transform:uppercase;">'+currentConstellation.rarity+'</div>'+
        '<div style="font-size:10px;color:#a09080;margin-top:4px;">'+currentConstellation.lore+'</div></div>';
    }

    // list all
    var sortOrder = ['mythic','legendary','rare','uncommon','common'];
    var sorted = [].concat(CONSTELLATIONS);
    sorted.sort(function(a,b){
      var ai = sortOrder.indexOf(a.rarity), bi = sortOrder.indexOf(b.rarity);
      return ai-bi;
    });

    sorted.forEach(function(c){
      var s = data.seen[c.id];
      var found = !!s;
      panel.innerHTML += '<div style="display:flex;align-items:center;padding:5px 8px;margin-bottom:2px;border-radius:6px;'+(found?'':'opacity:0.3')+'">'+
        '<span style="margin-right:8px;font-size:12px;">'+(found?'\u2B50':'\u2726')+'</span>'+
        '<div style="flex:1;font-size:12px;'+(found?'':'color:#504030')+'">'+(found?c.name:'???')+'</div>'+
        '<span style="font-size:9px;color:'+rarityColors[c.rarity]+';">'+c.rarity+(s&&s.count>1?' x'+s.count:'')+'</span></div>';
    });

    panel.innerHTML += '<div style="text-align:center;margin-top:12px;"><button onclick="document.getElementById(\'constellationJournal\').remove()" style="background:rgba(255,230,100,0.15);border:1px solid rgba(255,230,100,0.3);color:#ffe680;padding:6px 18px;border-radius:20px;cursor:pointer;">Close</button></div>';

    overlay.appendChild(panel);
    panel.addEventListener('click', function(e){ e.stopPropagation(); });
    overlay.addEventListener('click', function(){ overlay.remove(); });
    document.body.appendChild(overlay);
  }

  /* ---------- Init ---------- */
  function init() {
    load();

    // Add toggle button near tree
    var btn = document.createElement('div');
    btn.id = 'constellationBtn';
    btn.style.cssText = 'position:fixed;bottom:282px;left:25px;z-index:99997;cursor:pointer;font-size:12px;opacity:0.5;transition:opacity 0.3s;background:rgba(10,8,6,0.3);backdrop-filter:blur(4px);border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;';
    btn.textContent = '\uD83C\uDF1F';
    btn.title = 'Current Constellation';
    btn.addEventListener('mouseenter', function(){ btn.style.opacity='1'; });
    btn.addEventListener('mouseleave', function(){ btn.style.opacity='0.5'; });
    btn.addEventListener('click', toggleView);
    document.body.appendChild(btn);

    startWatcher();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(init, 3000); });
  else setTimeout(init, 3000);

  window.Constellations = {
    generate: generateConstellation,
    openJournal: openJournal,
    current: function(){ return currentConstellation; },
    count: function(){ load(); return Object.keys(data.seen).length; },
    total: function(){ return CONSTELLATIONS.length; }
  };
})();
