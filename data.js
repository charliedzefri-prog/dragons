// ====== СТИХИИ (авторские, по тематике персонажей) ======
const ELEMENTS = {
  digit:{name:"Цифра",ico:"🔢",color:"#3ea7ff",strong:["clock", "glitch"],weak:["cyber", "royal"]},
  clock:{name:"3:00",ico:"🕒",color:"#ff3b2a",strong:["night", "sheep"],weak:["digit", "doc"]},
  night:{name:"Ночь",ico:"🌙",color:"#4b3a8a",strong:["cat", "royal"],weak:["clock", "bird"]},
  cat:{name:"Кот",ico:"🐱",color:"#f4a23a",strong:["bird", "doc"],weak:["night", "beast"]},
  doc:{name:"Медицина",ico:"💉",color:"#5ec93a",strong:["clock", "beast"],weak:["cat", "glitch"]},
  bird:{name:"Птица",ico:"🐦",color:"#7de5d5",strong:["night", "money"],weak:["cat", "beast"]},
  cyber:{name:"Кибер",ico:"💾",color:"#00e5ff",strong:["digit", "money"],weak:["glitch", "sheep"]},
  glitch:{name:"Ошибка",ico:"🧩",color:"#c23bd6",strong:["cyber", "doc"],weak:["digit", "royal"]},
  sheep:{name:"Овца",ico:"🐏",color:"#d9c9b0",strong:["cyber", "royal"],weak:["clock", "money"]},
  royal:{name:"Корона",ico:"💎",color:"#ff5fb0",strong:["digit", "glitch"],weak:["night", "sheep"]},
  beast:{name:"Зверь",ico:"🐾",color:"#b8793c",strong:["cat", "bird"],weak:["doc", "money"]},
  money:{name:"Бабло",ico:"💰",color:"#3cbf5a",strong:["sheep", "beast"],weak:["bird", "cyber"]},
  zodiac:{name:"Зодиак",ico:"♈",color:"#ffd700",strong:["clock", "night"],weak:["glitch", "cyber"]},
  legend:{name:"Легенда",ico:"👑",color:"#ff4fe6",strong:["digit", "clock", "night", "cat", "doc", "bird", "cyber", "glitch", "sheep", "royal", "beast", "money", "zodiac"],weak:["divine"]},
  divine:{name:"Божество",ico:"🔱",color:"#ffe680",strong:["legend"],weak:["tyrant"]},
  tyrant:{name:"Тиран",ico:"💀",color:"#8b0000",strong:["divine", "legend"],weak:[]}
};
const BASE_ELEMENTS=["digit","clock","night","cat","doc","bird","cyber","glitch","sheep","royal","beast","money","zodiac"];
const ELEMENT_KEYS = Object.keys(ELEMENTS);

const RARITY = {
  common:{name:"Обычный",color:"#8d8d8d",mult:1.0, price:800},
  rare:{name:"Редкий",color:"#3ea7ff",mult:1.2, price:2500},
  epic:{name:"Эпический",color:"#a04fe6",mult:1.45, price:6000},
  legendary:{name:"Легендарный",color:"#ffb300",mult:1.8, price:15000},
  divine:{name:"Божественный",color:"#ff4fe6",mult:2.2, price:40000},
  tyrant:{name:"Тиранский",color:"#8b0000",mult:2.6, price:100000},
};

// ====== НАВЫКИ ======
// Каждая стихия: одиночная атака + разброс по всем (слабее). Без перезарядок.
// Способность стихии открывается в Академии на 4-м уровне древа этой стихии.
const SKILLS = {
  count:    {name:"Отсчёт",          type:"attack", power:1.0, el:"digit",  desc:"Удар цифрой"},
  count_s:  {name:"Перечисление",    type:"attack", power:0.62,el:"digit",  aoe:true, desc:"Цифры по всем врагам"},
  threeam:  {name:"Три часа ночи",   type:"attack", power:1.0, el:"clock",  desc:"Удар ровно в 3:00"},
  threeam_s:{name:"Бой часов",       type:"attack", power:0.62,el:"clock",  aoe:true, desc:"Удар часов по всем"},
  nightfall:{name:"Сумрак",          type:"attack", power:1.0, el:"night",  desc:"Удар из темноты"},
  nightfall_s:{name:"Кошмар",        type:"attack", power:0.62,el:"night",  aoe:true, desc:"Кошмар для всех"},
  scratch:  {name:"Царапки",         type:"attack", power:1.0, el:"cat",    desc:"Когтями по морде"},
  scratch_s:{name:"Кошачий концерт", type:"attack", power:0.62,el:"cat",    aoe:true, desc:"Мяуканье по всем"},
  inject:   {name:"Укол",            type:"attack", power:1.0, el:"doc",    desc:"Болезненная инъекция"},
  inject_s: {name:"Эпидемия",        type:"attack", power:0.62,el:"doc",    aoe:true, desc:"Заражает всех"},
  peck:     {name:"Клевок",          type:"attack", power:1.0, el:"bird",   desc:"Точный удар клювом"},
  peck_s:   {name:"Налёт стаи",      type:"attack", power:0.62,el:"bird",   aoe:true, desc:"Перья по всем"},
  laser:    {name:"Лазер",           type:"attack", power:1.0, el:"cyber",  desc:"Луч из визора"},
  laser_s:  {name:"Перегрузка сети", type:"attack", power:0.62,el:"cyber",  aoe:true, desc:"Разряд по всем"},
  corrupt:  {name:"Порча данных",    type:"attack", power:1.0, el:"glitch", desc:"Ошибка в цели"},
  corrupt_s:{name:"Синий экран",     type:"attack", power:0.62,el:"glitch", aoe:true, desc:"Сбой у всех"},
  ram:      {name:"Таран",           type:"attack", power:1.0, el:"sheep",  desc:"Удар рогами"},
  ram_s:    {name:"Стадо",           type:"attack", power:0.62,el:"sheep",  aoe:true, desc:"Овцы топчут всех"},
  decree:   {name:"Указ",            type:"attack", power:1.0, el:"royal",  desc:"Королевский приказ"},
  decree_s: {name:"Казнь",           type:"attack", power:0.62,el:"royal",  aoe:true, desc:"Наказать всех"},
  maul:     {name:"Рвать",           type:"attack", power:1.0, el:"beast",  desc:"Звериный удар"},
  maul_s:   {name:"Рык",             type:"attack", power:0.62,el:"beast",  aoe:true, desc:"Пугает всех"},
  bribe:    {name:"Подкуп",          type:"attack", power:1.0, el:"money",  desc:"Мешком денег по голове"},
  bribe_s:  {name:"Инфляция",        type:"attack", power:0.62,el:"money",  aoe:true, desc:"Обесценивает всех"},
  starfall: {name:"Звездопад",       type:"attack", power:1.05,el:"zodiac", desc:"Удар звездой"},
  starfall_s:{name:"Созвездие",      type:"attack", power:0.65,el:"zodiac", aoe:true, desc:"Звёзды по всем"},
  legendary:{name:"Гнев Легенды",    type:"attack", power:1.6, el:"legend", desc:"Силён против всех базовых стихий"},
  legendary_s:{name:"Легендарная буря",type:"attack",power:0.9,el:"legend", aoe:true, desc:"Легендарный удар по всем"},
  divine:   {name:"Кара Небес",      type:"attack", power:1.7, el:"divine", desc:"Силён против Легенды"},
  divine_s: {name:"Свет Небес",      type:"attack", power:0.95,el:"divine", aoe:true, desc:"По всем"},
  tyrant:   {name:"Гнёт Тирана",     type:"attack", power:1.8, el:"tyrant", desc:"Силён против Божеств и Легенд"},
  tyrant_s: {name:"Иго",             type:"attack", power:1.0, el:"tyrant", aoe:true, desc:"По всем"},
  // --- способности стихий (Академия, уровень 4 древа) ---
  multiply: {name:"Умножение",       type:"attack", power:0.9, el:"digit",  aoe:true, effect:"stun",  chance:0.35, desc:"Цифры по всем, 35% оглушить"},
  midnight: {name:"Полночь",         type:"attack", power:0.9, el:"clock",  aoe:true, effect:"burn",  desc:"Жжёт всех 3 хода"},
  lullaby:  {name:"Колыбельная",     type:"attack", power:0.8, el:"night",  aoe:true, effect:"freeze",chance:0.4, desc:"Усыпляет: 40% пропуск хода"},
  ninelives:{name:"Девять жизней",   type:"heal",   power:0.35,el:"cat",    effect:"hot", desc:"Лечит союзника 35% + 10% 2 хода"},
  surgery:  {name:"Операция",        type:"heal",   power:0.22,el:"doc",    aoe:true, effect:"cleanse", desc:"Лечит всех 22% и снимает эффекты"},
  flock:    {name:"Стая",            type:"buff",   power:0.5, el:"bird",   effect:"spd", desc:"Команда: +50% скорости"},
  overclock:{name:"Разгон",          type:"buff",   power:0.4, el:"cyber",  effect:"atk", desc:"Команда: +40% атаки на 2 хода"},
  crash:    {name:"Краш",            type:"debuff", power:0.4, el:"glitch", effect:"vuln", desc:"Враги: +40% получаемого урона"},
  woolshield:{name:"Шерстяной щит",  type:"buff",   power:0.25,el:"sheep",  effect:"shield", desc:"Щит на 25% HP каждому"},
  royaldecree:{name:"Королевский указ",type:"debuff",power:0.35,el:"royal", effect:"weaken", desc:"Враги: -35% атаки на 2 хода"},
  frenzy:   {name:"Бешенство",       type:"attack", power:1.5, el:"beast",  effect:"lifesteal", desc:"Сильный удар, лечит на 50% урона"},
  bailout:  {name:"Откуп",           type:"buff",   power:0.5, el:"money",  effect:"def", desc:"Команда: -50% урона на 2 хода"},
  horoscope:{name:"Гороскоп",        type:"heal",   power:0.2, el:"zodiac", aoe:true, desc:"Лечит всю команду на 20%"},
  legendrage:{name:"Ярость Легенды", type:"buff",   power:0.45,el:"legend", effect:"atk", desc:"Команда: +45% атаки"},
  divinegrace:{name:"Благодать",     type:"heal",   power:0.25,el:"divine", aoe:true, desc:"Лечит всех на 25%"},
  tyrantfear:{name:"Страх",          type:"debuff", power:0.45,el:"tyrant", effect:"vuln", desc:"Враги: +45% получаемого урона"},
};
const ELEMENT_ATTACK={digit:"count",clock:"threeam",night:"nightfall",cat:"scratch",doc:"inject",bird:"peck",cyber:"laser",glitch:"corrupt",sheep:"ram",royal:"decree",beast:"maul",money:"bribe",zodiac:"starfall",legend:"legendary",divine:"divine",tyrant:"tyrant"};
const ELEMENT_SPREAD=Object.fromEntries(Object.entries(ELEMENT_ATTACK).map(([e,k])=>[e,k+"_s"]));
const ELEMENT_ABILITY={digit:"multiply",clock:"midnight",night:"lullaby",cat:"ninelives",doc:"surgery",bird:"flock",cyber:"overclock",glitch:"crash",sheep:"woolshield",royal:"royaldecree",beast:"frenzy",money:"bailout",zodiac:"horoscope",legend:"legendrage",divine:"divinegrace",tyrant:"tyrantfear"};
const SLOT_LEVEL=[1,4,10];

// ====== АКАДЕМИЯ: древо стихии (6 уровней, как в оригинале) ======
// 1: +10% урона атак стихии · 2: пассив стихии · 3: разброс стихии (атака по всем) · 4: способность стихии · 5: пассив x2 · 6: выбор одного из двух бонусов
const TREE_COST=[3,5,8,12,16,20];
const TREE_MAX=6;
const TREE_PASSIVE={digit:"crit",clock:"atk",night:"spd",cat:"spd",doc:"hp",bird:"spd",cyber:"crit",glitch:"atk",sheep:"def",royal:"hp",beast:"atk",money:"def",zodiac:"crit",legend:"atk",divine:"hp",tyrant:"atk"};
const PASSIVE_INFO={hp:{n:"Здоровье",ico:"❤️",v:0.06},atk:{n:"Атака",ico:"⚔️",v:0.06},def:{n:"Защита",ico:"🛡️",v:0.06},spd:{n:"Скорость",ico:"💨",v:0.05},crit:{n:"Шанс крита",ico:"🎯",v:0.04}};
const FINAL_OPTIONS={
  digit:[{k:"crit",v:0.1,n:"Точный расчёт: +10% крита"},{k:"atk",v:0.15,n:"Большие числа: +15% атаки"}],
  clock:[{k:"lifesteal",v:0.1,n:"Ночной голод: вампиризм 10%"},{k:"atk",v:0.15,n:"3:33: +15% атаки"}],
  night:[{k:"spd",v:0.15,n:"Тень: +15% скорости"},{k:"startshield",v:0.2,n:"Покров ночи: щит 20% HP в начале боя"}],
  cat:[{k:"hp",v:0.15,n:"Девять жизней: +15% HP"},{k:"spd",v:0.15,n:"Кошачья грация: +15% скорости"}],
  doc:[{k:"hp",v:0.2,n:"Крепкое здоровье: +20% HP"},{k:"def",v:0.15,n:"Иммунитет: +15% защиты"}],
  bird:[{k:"spd",v:0.2,n:"Крылья: +20% скорости"},{k:"timing",v:0.03,n:"Зоркость: шире зона «Идеально»"}],
  cyber:[{k:"crit",v:0.1,n:"Прицел: +10% крита"},{k:"timing",v:0.03,n:"Автонаводка: шире зона «Идеально»"}],
  glitch:[{k:"atk",v:0.15,n:"Переполнение: +15% атаки"},{k:"startshield",v:0.2,n:"Резервная копия: щит 20% HP"}],
  sheep:[{k:"def",v:0.2,n:"Густая шерсть: +20% защиты"},{k:"hp",v:0.15,n:"Упитанность: +15% HP"}],
  royal:[{k:"hp",v:0.15,n:"Королевская кровь: +15% HP"},{k:"atk",v:0.15,n:"Власть: +15% атаки"}],
  beast:[{k:"lifesteal",v:0.12,n:"Хищник: вампиризм 12%"},{k:"atk",v:0.15,n:"Ярость: +15% атаки"}],
  money:[{k:"def",v:0.15,n:"Охрана: +15% защиты"},{k:"startshield",v:0.25,n:"Страховка: щит 25% HP"}],
  zodiac:[{k:"crit",v:0.12,n:"Судьба: +12% крита"},{k:"hp",v:0.15,n:"Звёздная защита: +15% HP"}],
  legend:[{k:"atk",v:0.2,n:"Легендарная мощь: +20% атаки"},{k:"hp",v:0.2,n:"Легендарная стойкость: +20% HP"}],
  divine:[{k:"hp",v:0.25,n:"Бессмертие: +25% HP"},{k:"lifesteal",v:0.15,n:"Святость: вампиризм 15%"}],
  tyrant:[{k:"atk",v:0.25,n:"Гнёт: +25% атаки"},{k:"startshield",v:0.3,n:"Трон: щит 30% HP"}],
};

// ====== ПОСТРОЙКИ ======
const BUILDINGS = {
  habitat_digit:  {req:1, name:"Числовая площадь", ico:"🔢", el:"digit",  cost:{gold:500},  cap:2, income:8},
  habitat_cat:    {req:1, name:"Кошачий дворик",   ico:"🐱", el:"cat",    cost:{gold:500},  cap:2, income:8},
  habitat_doc:    {req:2, name:"Клиника",          ico:"🏥", el:"doc",    cost:{gold:600},  cap:2, income:9},
  habitat_clock:  {req:3, name:"Башня 3:00",       ico:"🕒", el:"clock",  cost:{gold:700},  cap:2, income:9},
  habitat_bird:   {req:5, name:"Птичник",          ico:"🐦", el:"bird",   cost:{gold:900},  cap:2, income:10},
  habitat_night:  {req:7, name:"Ночной сад",       ico:"🌙", el:"night",  cost:{gold:1200}, cap:2, income:12},
  habitat_beast:  {req:9, name:"Логово",           ico:"🐾", el:"beast",  cost:{gold:1500}, cap:2, income:13},
  habitat_cyber:  {req:11,name:"Серверная",        ico:"💾", el:"cyber",  cost:{gold:1800}, cap:2, income:14},
  habitat_money:  {req:13,name:"Банк",             ico:"🏦", el:"money",  cost:{gold:2500}, cap:2, income:16},
  habitat_glitch: {req:15,name:"Сбойная зона",     ico:"🧩", el:"glitch", cost:{gold:3000}, cap:2, income:18},
  habitat_sheep:  {req:17,name:"Овчарня",          ico:"🐏", el:"sheep",  cost:{gold:3500}, cap:2, income:19},
  habitat_zodiac: {req:18,name:"Обсерватория",     ico:"🔭", el:"zodiac", cost:{gold:6000}, cap:2, income:30},
  habitat_royal:  {req:19,name:"Дворец",           ico:"🏰", el:"royal",  cost:{gold:5000}, cap:2, income:22},
  habitat_legend: {req:20,name:"Легендарный трон", ico:"👑", el:"legend", cost:{gold:8000,gems:20}, cap:1, income:40},
  habitat_divine: {req:22,name:"Небесный храм",    ico:"⛩️", el:"divine", cost:{gold:20000,gems:60}, cap:1, income:80},
  habitat_tyrant: {req:28,name:"Цитадель Тирана",  ico:"🏯", el:"tyrant", cost:{gold:80000,gems:150}, cap:1, income:150},
  academy:        {req:8, name:"Академия драконов",ico:"🏫", cost:{gold:6000}, unique:true, special:"academy"},
  incubator:      {req:1, name:"Инкубатор",        ico:"🥚", cost:{gold:0},    unique:true, special:"incubator"},
  library:        {req:5, name:"Библиотека",       ico:"📚", cost:{gold:2500}, unique:true, special:"library", scrolls:2, time:120*1000},
  phone:          {req:4, name:"Телефонная будка", ico:"📞", cost:{gold:1000}, unique:true, special:"phone"},
  dungeon:        {req:6, name:"Темница",          ico:"🏚️", cost:{gold:3000}, unique:true, special:"dungeon"},
  farm:           {req:1, name:"Ферма",            ico:"🌾", cost:{gold:300}, food:30, farm:true},
  bigfarm:        {req:6, name:"Большая ферма",    ico:"🚜", cost:{gold:1500}, food:150, farm:true},
  mine:           {req:12,name:"Шахта самоцветов", ico:"⛏️", cost:{gold:5000}, gems:1, farm:true, gemmine:true},
  deco_tree:      {req:1, name:"Дерево",           ico:"🌲", cost:{gold:100}, deco:true},
  deco_fountain:  {req:3, name:"Фонтан",           ico:"⛲", cost:{gold:600}, deco:true},
  deco_statue:    {req:4, name:"Статуя дракона",   ico:"🗿", cost:{gold:800}, deco:true},
};
const LIBRARY=BUILDINGS.library;
const HARVEST_TIME = 60*1000;
const MAP_W = 8, MAP_H = 6;
const START_UNLOCKED = 20;

// ====== ДРАКОНЫ ======
const DRAGONS = [
  {id:"d00", name:"Единица", els:["digit"], rarity:"common", base:{"hp": 100, "atk": 22, "def": 14, "spd": 12}, desc:"Первый дракон каждого Хранителя. Простой, но в очках он выглядит умнее, чем есть."},
  {id:"d01", name:"Единица-Доктор", els:["digit", "doc"], rarity:"rare", base:{"hp": 120, "atk": 20, "def": 16, "spd": 13}, desc:"Надел халат и теперь лечит. Диплом никто не проверял."},
  {id:"d02", name:"Акула-Единица", els:["digit", "beast"], rarity:"epic", base:{"hp": 110, "atk": 34, "def": 12, "spd": 15}, desc:"Древняя форма Единицы. Зубы настоящие, смотреть в глаза не рекомендуется."},
  {id:"d03", name:"Двойка Ночи", els:["digit", "night", "clock"], rarity:"rare", base:{"hp": 105, "atk": 28, "def": 12, "spd": 16}, desc:"Появляется ровно в 2:00. Змей на голове — это отдельная личность."},
  {id:"d04", name:"Четвёрка", els:["digit", "beast"], rarity:"common", base:{"hp": 115, "atk": 20, "def": 18, "spd": 9}, desc:"Крепкий, честный, немного упрямый. Любит стоять на месте."},
  {id:"d05", name:"Четвёрка-Волк", els:["digit", "beast", "cat"], rarity:"rare", base:{"hp": 120, "atk": 26, "def": 15, "spd": 13}, desc:"Отрастил шерсть и хвост. Воет на дракона месяца."},
  {id:"d06", name:"Четвёрка-Котик", els:["digit", "cat"], rarity:"rare", base:{"hp": 100, "atk": 24, "def": 13, "spd": 18}, desc:"Мурлычет только когда никто не видит."},
  {id:"d07", name:"Четвёрка-Гангстер", els:["digit", "money", "beast"], rarity:"epic", base:{"hp": 130, "atk": 30, "def": 18, "spd": 10}, desc:"Всё в татуировках «4». Золотое кольцо не снимает даже в бою."},
  {id:"d08", name:"Четвёрка-Киберпанк", els:["cyber"], rarity:"epic", base:{"hp": 110, "atk": 32, "def": 14, "spd": 17}, desc:"Родом из 2077. Правый и левый глаз работают на разных прошивках."},
  {id:"d09", name:"Четвёрка-Хакер", els:["digit", "cyber", "night"], rarity:"epic", base:{"hp": 105, "atk": 33, "def": 12, "spd": 19}, desc:"Полностью чёрный, кроме глаз. Уже взломал ваш сохранённый прогресс."},
  {id:"d10", name:"Четвёрка-Сотона", els:["legend", "digit", "clock"], rarity:"legendary", noflip:true, base:{"hp": 125, "atk": 40, "def": 14, "spd": 15}, desc:"Не спрашивайте, откуда пентаграмма. Просто не спрашивайте."},
  {id:"d11", name:"Бисквит", els:["royal"], rarity:"rare", base:{"hp": 100, "atk": 26, "def": 14, "spd": 15}, desc:"Маленькая королева с короной. Лапки в розочках."},
  {id:"d12", name:"Бисквит Ночи", els:["cat", "royal", "night"], rarity:"epic", base:{"hp": 110, "atk": 28, "def": 16, "spd": 14}, desc:"Пастельная форма Бисквит. Звёзды на шерсти светятся в темноте."},
  {id:"d13", name:"Доктор 222", els:["doc"], rarity:"common", base:{"hp": 110, "atk": 18, "def": 16, "spd": 11}, desc:"Зелёный врач с клыками. Стетоскоп — для антуража."},
  {id:"d14", name:"Доктор 333", els:["digit", "doc"], rarity:"rare", noflip:true, base:{"hp": 115, "atk": 22, "def": 16, "spd": 12}, desc:"Красный и добрый. Показывает время 3:33 без причины."},
  {id:"d15", name:"Доктор 666", els:["legend", "doc", "clock"], rarity:"legendary", noflip:true, base:{"hp": 130, "atk": 38, "def": 16, "spd": 13}, desc:"Худшая версия любого врача. Улыбка — часть диагноза."},
  {id:"d16", name:"Жархнне Злыдень", els:["sheep", "night"], rarity:"rare", base:{"hp": 110, "atk": 27, "def": 14, "spd": 12}, desc:"Овечка в чёрном платье со знаком Овна. Смотрит красными глазами."},
  {id:"d17", name:"Жархнне Киберпанк", els:["sheep", "cyber"], rarity:"rare", base:{"hp": 105, "atk": 25, "def": 14, "spd": 16}, desc:"Носит цифру 4 на футболке в честь друга."},
  {id:"d18", name:"Жархнне Кошмар", els:["sheep", "night", "glitch"], rarity:"epic", base:{"hp": 115, "atk": 31, "def": 14, "spd": 14}, desc:"Бант размером с голову. Биологическая опасность на платье не декоративная."},
  {id:"d19", name:"Руж", els:["cat"], rarity:"common", base:{"hp": 100, "atk": 23, "def": 12, "spd": 15}, desc:"Рыжая лисичка в розовом свитере. Всегда чуть-чуть нервничает."},
  {id:"d20", name:"Руж Кибер", els:["cat", "cyber"], rarity:"rare", base:{"hp": 100, "atk": 27, "def": 12, "spd": 18}, desc:"Очки с двумя экранами, свитер с четвёркой."},
  {id:"d21", name:"Руж Мулен", els:["cat", "royal", "money"], rarity:"epic", base:{"hp": 105, "atk": 30, "def": 13, "spd": 16}, desc:"Красное платье, шляпка, каблуки. Танцует, пока враги горят."},
  {id:"d22", name:"Руж на спорте", els:["cat", "digit"], rarity:"rare", base:{"hp": 105, "atk": 26, "def": 13, "spd": 20}, desc:"Номер 4 на майке. Быстрее всех на арене."},
  {id:"d23", name:"Руж Финдиректор", els:["cat", "money"], rarity:"epic", base:{"hp": 110, "atk": 29, "def": 15, "spd": 16}, desc:"Розовая, гипнотизирующая, с логотипом спирали. Ваш бюджет уже у неё."},
  {id:"d24", name:"Роуз Меха", els:["cat", "cyber", "beast"], rarity:"epic", base:{"hp": 120, "atk": 28, "def": 20, "spd": 12}, desc:"Бирюзовые глаза-фары. Бронирована по последней моде."},
  {id:"d25", name:"Роуз Миллер", els:["cat", "royal"], rarity:"rare", base:{"hp": 105, "atk": 24, "def": 14, "spd": 17}, desc:"Розовая кошечка с большими глазами. Милая, пока не разозлишь."},
  {id:"d26", name:"Роуз Алочная", els:["cat", "money"], rarity:"rare", base:{"hp": 120, "atk": 24, "def": 19, "spd": 8}, desc:"Серая, с жёлтыми глазами и шарфом. Всё, что блестит — её."},
  {id:"d27", name:"Роуз в свитере", els:["cat", "royal"], rarity:"common", base:{"hp": 105, "atk": 21, "def": 14, "spd": 14}, desc:"Уютная версия Роуз. Свитер связала сама."},
  {id:"d28", name:"Роуз Одетая", els:["cat", "bird"], rarity:"rare", base:{"hp": 105, "atk": 25, "def": 14, "spd": 17}, desc:"Джинсовые шорты и свитер — идеальный образ Хранителя."},
  {id:"d29", name:"Роуз Смешная", els:["cat", "beast"], rarity:"common", base:{"hp": 110, "atk": 20, "def": 14, "spd": 16}, desc:"Четыре лапы, ноль забот."},
  {id:"d30", name:"Т-Рекс СОСАЛ", els:["divine", "beast", "clock"], rarity:"divine", base:{"hp": 160, "atk": 48, "def": 20, "spd": 11}, desc:"Древний ужас с рогом. Надпись на морде — не наша инициатива."},
  {id:"d31", name:"Ошибка 4614", els:["legend", "glitch", "digit"], rarity:"legendary", base:{"hp": 130, "atk": 42, "def": 15, "spd": 16}, desc:"Родился из сбоя в матрице. Глаза разных цветов, тело — из строк года."},
  {id:"d32", name:"Бесконечность Ночи", els:["night", "clock", "digit"], rarity:"epic", base:{"hp": 110, "atk": 34, "def": 12, "spd": 16}, desc:"Красный демон с часами на животе. Показывает время, которого не существует."},
  {id:"d33", name:"Бисквит Джаггало", els:["royal", "night"], rarity:"rare", base:{"hp": 105, "atk": 27, "def": 13, "spd": 15}, desc:"Клоунский грим, полосатые гетры и корона. Whoop whoop."},
  {id:"d34", name:"Бисквит Свадебная", els:["royal", "money", "cat"], rarity:"epic", base:{"hp": 110, "atk": 26, "def": 16, "spd": 15}, desc:"Смокинг, бабочка и роза. Гости ещё не пришли, а торт уже съеден."},
  {id:"d35", name:"Бычок Рори", els:["beast"], rarity:"rare", base:{"hp": 125, "atk": 28, "def": 16, "spd": 9}, desc:"Силуэт быка из глубин. Неизвестно, что у него на уме."},
  {id:"d36", name:"Бычок", els:["beast", "sheep", "money"], rarity:"epic", base:{"hp": 135, "atk": 32, "def": 18, "spd": 9}, desc:"Золотой минотавр с красными глазами. Бодается по любви."},
  {id:"d37", name:"Вера Призрак", els:["night"], rarity:"rare", base:{"hp": 95, "atk": 24, "def": 10, "spd": 22}, desc:"Полупрозрачная воительница. Пройти сквозь неё легко, пройти мимо — нет."},
  {id:"d38", name:"Весы", els:["legend", "zodiac", "money"], rarity:"legendary", base:{"hp": 130, "atk": 38, "def": 17, "spd": 15}, eventOnly:true, desc:"Зодиакальные Весы. На одной чаше еда, на другой — тоже еда."},
  {id:"d39", name:"Змееносец", els:["legend", "zodiac", "night"], rarity:"legendary", base:{"hp": 125, "atk": 38, "def": 15, "spd": 14}, eventOnly:true, desc:"13-й знак зодиака. Змеи на голове спорят, кто главный."},
  {id:"d40", name:"Буква К", els:["digit", "bird"], rarity:"common", base:{"hp": 100, "atk": 23, "def": 13, "spd": 14}, desc:"Жёлтая буква с шапкой. Кусается."},
  {id:"d41", name:"Мэдли Хирург", els:["doc", "glitch"], rarity:"rare", base:{"hp": 110, "atk": 22, "def": 16, "spd": 13}, desc:"Фиолетовый круглый доктор в очках. Оперирует чем попало."},
  {id:"d42", name:"Мэдли Человек", els:["doc", "night"], rarity:"epic", base:{"hp": 115, "atk": 29, "def": 15, "spd": 14}, desc:"Человеческая форма Мэдли в чёрном пальто. Всё ещё врач."},
  {id:"d43", name:"Буква Н", els:["digit", "night"], rarity:"common", base:{"hp": 105, "atk": 22, "def": 14, "spd": 13}, desc:"Фиолетовая буква с зубами. Держит форму."},
  {id:"d44", name:"Огурец-Птица", els:["bird", "doc"], rarity:"common", base:{"hp": 110, "atk": 21, "def": 14, "spd": 15}, desc:"Зелёный, пупырчатый, с клювом. Эволюция пошла куда-то не туда."},
  {id:"d45", name:"Ойсмарт Мафиози", els:["bird", "money", "night"], rarity:"epic", base:{"hp": 115, "atk": 31, "def": 16, "spd": 14}, desc:"Птица в полосатом костюме и шляпе. Предложение, от которого нельзя отказаться."},
  {id:"d46", name:"Ойсмарт Сонный", els:["bird", "night"], rarity:"rare", base:{"hp": 120, "atk": 20, "def": 17, "spd": 8}, desc:"В пижаме со звёздами. Атакует во сне, довольно метко."},
  {id:"d47", name:"Ойсмарт", els:["bird"], rarity:"common", base:{"hp": 100, "atk": 24, "def": 12, "spd": 17}, desc:"Зелёная птица с огромным оранжевым клювом. Умнее, чем выглядит."},
  {id:"d48", name:"Самолёт", els:["legend", "cyber", "bird"], rarity:"legendary", base:{"hp": 120, "atk": 36, "def": 20, "spd": 20}, desc:"Хромированная летающая штука. Никто не понял, где у неё перед."},
  {id:"d49", name:"Гнев", els:["clock"], rarity:"rare", base:{"hp": 100, "atk": 32, "def": 10, "spd": 15}, desc:"Один из смертных грехов. Злится даже на этот текст."},
  {id:"d50", name:"Чревоугодие", els:["clock", "money"], rarity:"rare", base:{"hp": 130, "atk": 24, "def": 16, "spd": 9}, desc:"Красный повар с колпаком. Ест противников буквально."},
  {id:"d51", name:"СмартЧест.exe", els:["cyber", "glitch", "money"], rarity:"epic", base:{"hp": 140, "atk": 26, "def": 22, "spd": 7}, desc:"Сундук с красными глазами. Не открывайте. Серьёзно."},
  {id:"d52", name:"Сосал", els:["legend", "clock", "night"], rarity:"legendary", base:{"hp": 120, "atk": 40, "def": 14, "spd": 15}, desc:"Тёмный демон с рогами и говорящей улыбкой. Не надо это переводить."},
  {id:"d53", name:"Страус-Повар", els:["bird", "royal", "beast"], rarity:"epic", base:{"hp": 115, "atk": 29, "def": 15, "spd": 17}, desc:"Крылатый страус-акробат в поварском колпаке. Готовит и летает одновременно."},
  {id:"d54", name:"Мистер Супер Куки", els:["cat", "royal", "money"], rarity:"epic", base:{"hp": 110, "atk": 30, "def": 14, "spd": 16}, desc:"Цилиндр, маска и радужный клюв-усы. Джентльмен-суперкот."},
  {id:"d55", name:"Супер Куки", els:["cat", "bird"], rarity:"rare", base:{"hp": 105, "atk": 26, "def": 14, "spd": 16}, desc:"Рыжий котик с радужными пятнами. Официально самый милый."},
  {id:"d56", name:"Высокая Температура", els:["legend", "doc", "clock"], rarity:"legendary", base:{"hp": 125, "atk": 41, "def": 13, "spd": 14}, desc:"Горящий чёрный сгусток с зубами. 39.9 и растёт."},
  {id:"d57", name:"Шелли", els:["sheep", "night", "royal"], rarity:"rare", base:{"hp": 105, "atk": 25, "def": 15, "spd": 15}, desc:"Серая зайка в сетчатых чулках и ботинках. Чёрно-белая, как её настроение."},
  {id:"d58", name:"Шестёрка Меха", els:["digit", "cyber", "clock"], rarity:"epic", noflip:true, base:{"hp": 120, "atk": 31, "def": 19, "spd": 12}, desc:"Красный робот-демон с хвостом-когтем. 666 на груди — серийный номер."},
  {id:"d59", name:"Шестёрка Серафим", els:["divine", "digit", "clock"], rarity:"divine", noflip:true, base:{"hp": 150, "atk": 46, "def": 18, "spd": 18}, desc:"Одноглазый ангел с шестью крыльями. Нимб настоящий, рога тоже."},
  {id:"d60", name:"Девятка Туманная", els:["digit", "glitch", "night"], rarity:"epic", base:{"hp": 110, "atk": 33, "def": 12, "spd": 16}, desc:"Фиолетовая, размытая, злая. Пентаграмма на груди светится."},
  {id:"d61", name:"Девятка Белая", els:["digit", "glitch"], rarity:"rare", base:{"hp": 105, "atk": 27, "def": 14, "spd": 15}, desc:"Белая девятка с красной повязкой. Нет, лучше не спрашивать."},
  {id:"d62", name:"Девятка", els:["digit"], rarity:"common", noflip:true, base:{"hp": 100, "atk": 24, "def": 13, "spd": 15}, desc:"Розовая, широко улыбается. Зубов больше, чем нужно."},
  {id:"d63", name:"Dolphy.vhs", els:["tyrant", "glitch", "night"], rarity:"tyrant", base:{"hp": 170, "atk": 52, "def": 22, "spd": 14}, desc:"Скелет с колонками вместо плеч и крыльями летучей мыши. Записан на кассету."},
  {id:"d64", name:"L-24", els:["cat", "royal", "digit"], rarity:"rare", base:{"hp": 110, "atk": 24, "def": 16, "spd": 14}, desc:"Серая кошечка с оранжевой короной и футболкой L-24. Спокойная версия Бисквит."},
  {id:"d65", name:"Лофо Адекватный", els:["cat", "digit"], rarity:"common", base:{"hp": 105, "atk": 23, "def": 13, "spd": 15}, desc:"Рыжий кот в оранжевой футболке с четвёркой. Редкий момент адекватности."},
  {id:"d66", name:"Лофо Рэмбо", els:["cat", "beast", "money"], rarity:"epic", base:{"hp": 115, "atk": 33, "def": 15, "spd": 15}, desc:"Повязка на голове, жетон на шее. Один против всех."},
  {id:"d67", name:"Лофо Скибиди", els:["cat", "glitch"], rarity:"rare", base:{"hp": 110, "atk": 26, "def": 14, "spd": 14}, desc:"Голова кота в унитазе. Мы тоже не знаем, зачем."},
  {id:"d68", name:"Лофо", els:["cat", "doc"], rarity:"common", base:{"hp": 105, "atk": 22, "def": 13, "spd": 16}, desc:"Зелёная футболка с тройкой, джинсы. Базовый Лофо."},
  {id:"d69", name:"MR 111", els:["digit", "money", "royal"], rarity:"rare", noflip:true, base:{"hp": 110, "atk": 26, "def": 16, "spd": 14}, desc:"Белолицый джентльмен в цилиндре с зелёными единицами. Считает до одного."},
  {id:"d70", name:"MR 222", els:["digit", "clock"], rarity:"rare", noflip:true, base:{"hp": 105, "atk": 28, "def": 13, "spd": 15}, desc:"Зелёный, ухмыляется, орёт «ТЕБЕ 2!!!». Кошмар любого школьника."},
  {id:"d71", name:"MR 333", els:["digit", "clock", "night"], rarity:"legendary", noflip:true, base:{"hp": 135, "atk": 44, "def": 15, "spd": 16}, eventOnly:true, desc:"Красный, рогатый, 3:33 на шляпе. Позвони ему — он ответит. И придёт со своей командой."},
  {id:"d72", name:"MR 444", els:["digit", "night", "glitch"], rarity:"epic", noflip:true, base:{"hp": 110, "atk": 35, "def": 12, "spd": 16}, desc:"Чёрный, с паучьими лапами и надписью R.I.P. Четыре — значит смерть."},
  {id:"d73", name:"MR Доллар", els:["money"], rarity:"rare", noflip:true, base:{"hp": 105, "atk": 25, "def": 14, "spd": 16}, desc:"Зелёный, в очках, весь в долларах. Заработал на тебе."},
  {id:"d74", name:"MR 555", els:["digit", "money", "night"], rarity:"rare", noflip:true, base:{"hp": 115, "atk": 27, "def": 16, "spd": 12}, desc:"Серолицый с длинным носом и денежной лентой на шляпе. Зубастый банкир."},
  {id:"d75", name:"MR 666", els:["legend", "digit", "clock"], rarity:"legendary", noflip:true, base:{"hp": 130, "atk": 42, "def": 14, "spd": 15}, desc:"Полностью чёрный, светится красным. Финальная форма всех MR."},
  {id:"d76", name:"Ноль Баланс", els:["digit", "clock", "royal"], rarity:"epic", base:{"hp": 115, "atk": 31, "def": 14, "spd": 16}, desc:"Наполовину красный, наполовину жёлтый, один глаз. Идеальное равновесие хаоса."},
  {id:"d77", name:"Ноль Бездна", els:["digit", "glitch", "night"], rarity:"epic", base:{"hp": 120, "atk": 30, "def": 15, "spd": 14}, desc:"Фиолетовый, пунктирный, с кричащим ртом. Смотрит из бездны — и бездна смотрит в ответ."},
  {id:"d78", name:"Ноль No Texture", els:["glitch"], rarity:"rare", base:{"hp": 110, "atk": 27, "def": 16, "spd": 15}, desc:"Текстура не загрузилась. Жёлто-чёрный шахматный дракон-ошибка."},
  {id:"d79", name:"Семёрка Бандит", els:["digit", "money", "cyber"], rarity:"epic", base:{"hp": 115, "atk": 32, "def": 15, "spd": 15}, desc:"Голубая семёрка в чёрных очках и адидасе. Семки не предлагать."},
  {id:"d80", name:"Семёрка Британия", els:["digit", "royal", "bird"], rarity:"rare", base:{"hp": 110, "atk": 26, "def": 15, "spd": 16}, desc:"Раскрашена в Юнион Джек. Пьёт чай ровно в семь."},
  {id:"d81", name:"Восьмёрка Горничная", els:["digit", "doc", "royal"], rarity:"epic", base:{"hp": 120, "atk": 28, "def": 18, "spd": 13}, desc:"Два глаза-восьмёрки и фартук. Убирает арену после каждого боя."},
  {id:"d82", name:"Восьмёрка Кондукторша", els:["digit", "money", "night"], rarity:"rare", base:{"hp": 115, "atk": 27, "def": 15, "spd": 14}, desc:"Седые волосы, форма и свисток. Оплачивайте проезд, иначе укусит."},
  {id:"d83", name:"АнтиТемми Тру", els:["cat", "night", "glitch"], rarity:"epic", base:{"hp": 110, "atk": 33, "def": 13, "spd": 17}, desc:"Тёмная корона, зелёно-чёрный свитер. Полная противоположность Темми."},
  {id:"d84", name:"АнтиТемми", els:["cat", "glitch", "royal"], rarity:"rare", base:{"hp": 105, "atk": 25, "def": 14, "spd": 18}, desc:"hOI!!! Но в чёрно-зелёном. Нужно денег на колледж."},
  {id:"d85", name:"Дримкор Смокинг", els:["clock", "royal", "money"], rarity:"epic", base:{"hp": 120, "atk": 29, "def": 17, "spd": 14}, desc:"Часы вместо головы, глаз вместо циферблата, белый смокинг. Время всегда 11:59."},
  {id:"d86", name:"Дримкор", els:["clock", "night", "glitch"], rarity:"rare", base:{"hp": 115, "atk": 27, "def": 15, "spd": 14}, desc:"Тот же часовой человек, но в футболке Thrasher. Скейт остался во сне."},
  {id:"d87", name:"Жархнне Роберт", els:["sheep"], rarity:"rare", base:{"hp": 115, "atk": 26, "def": 16, "spd": 13}, desc:"Белая овечка с фиолетовым поясом и оранжевым S. Главный конкурент Жархнне."},
  {id:"d88", name:"Роуз Немецкая", els:["cat", "cyber", "doc"], rarity:"rare", base:{"hp": 110, "atk": 26, "def": 16, "spd": 15}, desc:"Чёрно-белая кошечка в очках с красным жетоном. Пунктуальна до секунды."},
  {id:"d89", name:"Чара", els:["night", "glitch", "beast"], rarity:"epic", base:{"hp": 115, "atk": 34, "def": 13, "spd": 16}, desc:"Пиксельная, в зелёном свитере с полоской. Улыбается. Не доверяй."},
  {id:"d90", name:"Опиумная Птица", els:["bird", "night"], rarity:"rare", base:{"hp": 110, "atk": 27, "def": 14, "spd": 17}, desc:"Серый лохматый призрак с клювом-маской. Никто не видел, что под перьями."},
  {id:"d91", name:"Опиумная Птица Голубая", els:["bird", "night", "glitch"], rarity:"epic", base:{"hp": 115, "atk": 30, "def": 15, "spd": 18}, desc:"Голубая форма. Холоднее, тише и ещё более лохматая."},
  {id:"d92", name:"Тройка Хавергот", els:["digit", "cyber", "beast"], rarity:"epic", base:{"hp": 125, "atk": 31, "def": 17, "spd": 15}, desc:"Кибер-конь на ховерборде с седлом-антенной. Подмигивает визором."},
  {id:"d93", name:"Профессор 666", els:["legend", "clock", "digit"], rarity:"legendary", noflip:true, base:{"hp": 135, "atk": 43, "def": 15, "spd": 15}, desc:"Чёрный профессор в квадратной шапочке с надписью 666. Читает лекцию о конце света."},
  {id:"d94", name:"Майк Форест", els:["cat", "night", "royal"], rarity:"rare", base:{"hp": 110, "atk": 26, "def": 15, "spd": 16}, desc:"Кот с фиолетовой чёлкой и полуприкрытыми глазами. Слишком спокоен для этого мира."},
  {id:"d95", name:"Ликёр", els:["cat", "cyber"], rarity:"rare", base:{"hp": 105, "atk": 27, "def": 14, "spd": 17}, desc:"Фиолетовый кот в очках и штанах с завязанным свитером. Крепкий, как название."},
  {id:"d96", name:"Близнецы", els:["legend", "zodiac", "clock"], rarity:"legendary", base:{"hp": 125, "atk": 40, "def": 14, "spd": 18}, eventOnly:true, desc:"Жёлтая половина показывает 6:00, красная — 3:00. Спорят, кто из них настоящий."},
  {id:"d97", name:"Водолей", els:["legend", "zodiac", "doc"], rarity:"legendary", base:{"hp": 135, "atk": 36, "def": 17, "spd": 14}, eventOnly:true, desc:"Седой бородач льёт воду из кувшина. Бесконечно."},
  {id:"d98", name:"Дева", els:["legend", "zodiac", "royal"], rarity:"legendary", base:{"hp": 125, "atk": 38, "def": 15, "spd": 16}, eventOnly:true, desc:"Розовая принцесса с золотой короной и львиной гривой. Точность во всём."},
  {id:"d99", name:"Козерог", els:["legend", "zodiac", "sheep"], rarity:"legendary", base:{"hp": 130, "atk": 41, "def": 15, "spd": 15}, eventOnly:true, desc:"Рогатый, зубастый и очень целеустремлённый."},
  {id:"d100", name:"Лев", els:["legend", "zodiac", "cat"], rarity:"legendary", base:{"hp": 130, "atk": 42, "def": 14, "spd": 16}, eventOnly:true, desc:"Пушистая грива и голубой хвост со звездой. Царь всех котов."},
  {id:"d101", name:"Овен", els:["legend", "zodiac", "sheep"], rarity:"legendary", base:{"hp": 125, "atk": 43, "def": 13, "spd": 16}, eventOnly:true, desc:"Красный череп-баран в мантии. Первый в зодиаке, первый в бою."},
  {id:"d102", name:"Рак", els:["legend", "zodiac", "beast"], rarity:"legendary", base:{"hp": 140, "atk": 36, "def": 19, "spd": 12}, eventOnly:true, desc:"Розовый краб с двумя клешнями-ключами. Ходит боком, бьёт прямо."},
  {id:"d103", name:"Рыбы", els:["legend", "zodiac", "bird"], rarity:"legendary", base:{"hp": 130, "atk": 37, "def": 16, "spd": 17}, eventOnly:true, desc:"Голубая рыба с морской звездой на голове. Плавает по воздуху."},
  {id:"d104", name:"Скорпион", els:["legend", "zodiac", "bird"], rarity:"legendary", base:{"hp": 125, "atk": 44, "def": 13, "spd": 17}, eventOnly:true, desc:"Зелёная злая птица с хвостом скорпиона. Яд в подарок."},
  {id:"d105", name:"Стрелец", els:["legend", "zodiac", "digit"], rarity:"legendary", base:{"hp": 120, "atk": 42, "def": 13, "spd": 19}, eventOnly:true, desc:"Фиолетовый лучник в зелёной шляпе с пером. Не промахивается."},
  {id:"d107", name:"Алмазный Голем", els:["legend", "royal", "cyber"], rarity:"legendary", base:{"hp": 145, "atk": 40, "def": 20, "spd": 12}, desc:"Серый каменный великан с головой-алмазом. Молчит, сияет, дробит."},
  {id:"d108", name:"Барашка", els:["sheep", "beast"], rarity:"epic", base:{"hp": 120, "atk": 32, "def": 16, "spd": 13}, desc:"Настоящий горный баран с закрученными рогами. Не мультяшный. Опасный."},
  {id:"d109", name:"Г.Б.Т.", els:["tyrant", "clock", "glitch"], rarity:"tyrant", base:{"hp": 170, "atk": 52, "def": 20, "spd": 17}, eventOnly:true, boss:true, desc:"Гнев. Бесконечность. Тьма. Финальный босс кампании — то, что появляется, когда все часы показывают 3:00."},
  {id:"d110", name:"Амальгамет 396", els:["glitch", "digit", "night"], rarity:"epic", base:{"hp": 130, "atk": 36, "def": 15, "spd": 16}, desc:"Сплав из тройки, девятки и шестёрки — кривой, шатающийся, но цифры на нём считают правильно. Иногда. Символы на теле меняются, когда он злится."},
  {id:"d111", name:"Амальгамет 444", els:["glitch", "digit", "beast"], rarity:"epic", base:{"hp": 140, "atk": 38, "def": 17, "spd": 12}, desc:"Три Четвёрки, сросшиеся в одного. Ходят вместе, думают порознь. Если спросить «сколько вас?», ответит «четыре»."},
  {id:"d112", name:"Амальгамет Сундук", els:["glitch", "money", "cyber"], rarity:"epic", base:{"hp": 150, "atk": 30, "def": 22, "spd": 10}, desc:"Сундук, из которого выросли зелёные глаза. Смотрит на золото. Смотрит на тебя. Открывать не рекомендуется."},
  {id:"d113", name:"Сайбер Вульф Заяц", els:["cyber", "beast", "glitch"], rarity:"epic", base:{"hp": 125, "atk": 40, "def": 14, "spd": 19}, desc:"Наполовину розовый, наполовину синий, целиком странный. Ни волк, ни заяц — уши длинные, зубы кроличьи, а глаза светятся. В жёлтой кофте, потому что так надо."},
  {id:"d106", name:"Телец", els:["legend", "zodiac", "beast"], rarity:"legendary", base:{"hp": 140, "atk": 40, "def": 18, "spd": 13}, eventOnly:true, desc:"Голубой бык с кольцом в носу и огоньком на лбу. Не машите красным."},
];

// Цена дракона: 1 стихия — золото; 2–3 стихии, легенды, божества и тираны — 💎 (детерминированно по id)
function dragonPrice(dr){const h=[...dr.id].reduce((a,c)=>a*31+c.charCodeAt(0),7)%1000/1000;const rng=(a,b)=>({gems:Math.round(a+(b-a)*h)});
  if(dr.rarity==="divine"||dr.rarity==="tyrant")return rng(6500,7777);
  if(dr.rarity==="legendary"||dr.els.includes("legend"))return rng(2444,3213);
  const n=dr.els.length;if(n>=3)return rng(777,1400);if(n===2)return rng(400,777);
  return {gold:RARITY[dr.rarity].price}}
const RARITY_REQ = {common:1, rare:4, epic:8, legendary:14, divine:22, tyrant:28};
const STAGES = [[1,"Малыш"],[4,"Подросток"],[10,"Взрослый"],[20,"Мастер"],[30,"Легенда"]];
const HAB_MAX_LVL = 5;
const HAB_UP = lvl => ({gold: Math.round(1500*Math.pow(2.2,lvl-1))});
const HAB_CAP = (b,lvl) => b.cap + (lvl-1);
const HAB_STORE = (b,lvl) => Math.round(b.income*60*lvl*lvl);
const GOLD_PER_MIN = (b,dragonLvl,rarityMult) => Math.round(b.income*0.5*(1+dragonLvl*0.35)*rarityMult);
const ISLANDS = [
  {id:"main",   name:"Главный остров",     req:1,  cost:{gold:0},      w:8, h:6, start:20, theme:"#5cbf4a"},
  {id:"sunny",  name:"Солнечный остров",   req:6,  cost:{gold:15000},  w:7, h:6, start:12, theme:"#d8c25a"},
  {id:"jungle", name:"Остров Джунглей",    req:11, cost:{gold:60000},  w:8, h:7, start:14, theme:"#2f8f3a"},
  {id:"frost",  name:"Ледяной остров",     req:16, cost:{gold:200000,gems:30}, w:8, h:7, start:14, theme:"#9fd8e8"},
  {id:"volcano",name:"Вулканический остров",req:21, cost:{gold:600000,gems:80}, w:9, h:7, start:16, theme:"#7a3a2a"},
  {id:"sky",    name:"Небесный остров",    req:26, cost:{gold:1500000,gems:150}, w:9, h:8, start:16, theme:"#bfe0ff"},
];
const TRAININGS = [
  {name:"Короткая",  time:60*1000,   sp:2,  cost:{gold:300}},
  {name:"Средняя",   time:180*1000,  sp:7,  cost:{gold:900}},
  {name:"Длинная",   time:600*1000,  sp:25, cost:{gold:2800}},
];
const ROOM_REQ = [8, 12, 18];
const INCUBATOR_NESTS = l => l>=15?3:l>=7?2:1;
const HATCH_TIME = {common:30e3, rare:90e3, epic:240e3, legendary:600e3, divine:900e3, tyrant:1200e3};
const BREED_TIME = 120*1000;
const LEGEND_BREED = {minLvl:10, chance:0.10, time:300*1000};
const DIVINE_BREED = {minLvl:20, chance:0.15, time:600*1000};
const TYRANT_BREED = {minLvl:25, chance:0.10, time:1200*1000};
const TIMING = {perfect:{atk:1.3,block:0.5,w:0.14,label:"ИДЕАЛЬНО!"}, good:{atk:1.0,block:0.25,w:0.42,label:"Хорошо"}, miss:{atk:0.8,block:0,label:"Мимо"}};
const XP_TABLE = [0, 60, 120, 200, 320, 480, 700, 950, 1300];
const SCROLL_PER_WIN = lvl => 1 + Math.floor(lvl/4);
const SCROLL_DAILY = 3;
const SCROLL_SHOP = {gold:1500};
const SCROLL_TO_SP = 1;
const BASIC_DRAGONS = {digit:"d00", cat:"d19", doc:"d13", clock:"d49", bird:"d47", night:"d37", beast:"d35", cyber:"d08", money:"d73", glitch:"d78", sheep:"d87", royal:"d11"};
const DRAGON_REQ = {};
DRAGONS.forEach(dr=>{
  if(Object.values(BASIC_DRAGONS).includes(dr.id)){DRAGON_REQ[dr.id]=(BUILDINGS["habitat_"+dr.els[0]]||{req:1}).req;return}
  const habReq=Math.max(...dr.els.filter(e=>BUILDINGS["habitat_"+e]).map(e=>BUILDINGS["habitat_"+e].req),1);
  DRAGON_REQ[dr.id]=Math.max(RARITY_REQ[dr.rarity], habReq);
});
// ====== СОБЫТИЯ ======
const PHONE_EVENT={req:4, cooldown:60*60*1000, team:["d71","d93","d15"], lvlBonus:6, reward:{gold:3000,gems:15,scrolls:10}, egg:"d71"};
const ZODIAC_IDS=["d101","d106","d96","d102","d100","d98","d38","d104","d105","d99","d97","d103","d39"];
const ZODIAC_EVENT={req:10, stages:13, eggAt:[4,8,13], baseLvl:8};
const DUNGEON={req:6};

// ====== АВАТАРКИ ======
const AVATARS=[{id:"av0",n:"666"},{id:"av1",n:"Сосал"},{id:"av2",n:"БВ"},{id:"av3",n:"Гей"},{id:"av4",n:"Лофоминус"},{id:"av5",n:"Лугер"},{id:"av6",n:"Ойсмарт"}];
// ====== PVP ======
const PVP_TURN_MS=10000;
const LEAGUES=[{n:"Деревянная",min:0,ico:"🪵"},{n:"Бронзовая",min:300,ico:"🥉"},{n:"Серебряная",min:700,ico:"🥈"},{n:"Золотая",min:1200,ico:"🥇"},{n:"Алмазная",min:1800,ico:"💎"},{n:"Легендарная",min:2500,ico:"👑"}];
// ====== КАМПАНИЯ (сюжет) ======
// Каждый узел: противник (name,lvl,ids) + диалоги до/после. Персонажи-рассказчики: имя, картинка (id дракона) или аватар.
const CAMPAIGN=[
 {ch:1,title:"Глава 1. Пробуждение острова",bg:"#5cbf4a",nodes:[
  {name:"Новичок Пит",lvl:1,ids:["d29"],pre:[["d19","Кот","Мяу. Ты новый Хранитель? Остров давно ждал кого-то, кто умеет считать хотя бы до трёх."],["d29","Пит","Эй! Я тут первый пришёл! Хочешь остров — сначала победи меня!"]],post:[["d29","Пит","Ладно-ладно… ты неплох. Слушай, по ночам в 3:00 из башни на холме слышен звон. Не ходи туда."]]},
  {name:"Огурчик",lvl:1,ids:["d44","d68"],pre:[["d44","Огурчик","Зелёный, хрустящий и очень злой! Мои птицы клюют всё, что движется."]],post:[["d00","Единица","Один. Один. Хранитель, ты слышишь? Числа тоже что-то считают. Считают до трёх…"]]},
  {name:"Ученик Лофо",lvl:2,ids:["d65","d47"],pre:[["d65","Лофо","Я учусь у самого Профессора 666! Он говорит, что скоро всё изменится. Все часы… все!"]],post:[["d65","Лофо","Профессор сказал: «Когда двенадцать знаков сойдутся, откроется третий час». Я не понял. А ты?"]]},
  {name:"Птичий двор",lvl:2,ids:["d90","d47","d44"],pre:[["d90","Опиумная Птица","Курлык. Мы видели красного с рогами. Он раздавал всем телефоны и говорил «звони в три»."]],post:[["d90","Опиумная Птица","Ты сильнее, чем кажешься. Лети дальше — Клиника ждёт."]]},
 ]},
 {ch:2,title:"Глава 2. Клиника 222-666",bg:"#3aa06a",nodes:[
  {name:"Доктора-стажёры",lvl:3,ids:["d13","d41"],pre:[["d13","Доктор","Пациент! Наконец-то! У нас тут эпидемия: все больные бредят одним и тем же временем."]],post:[["d41","Стажёр","Они все шепчут: «Г… Б… Т…». Мы не знаем, что это. Главврач знает, но он… изменился."]]},
  {name:"Стражница Роуз",lvl:3,ids:["d27","d25","d28"],pre:[["d27","Роуз","Дальше нельзя. Главврач приказал никого не пускать к башне. Ничего личного, Хранитель."]],post:[["d27","Роуз","…Иди. Но знай: Доктор 666 уже не лечит. Он считает."]]},
  {name:"Банда Четвёрок",lvl:5,ids:["d05","d06","d07"],pre:[["d06","Четвёрка","Четыре! Нас четверо! Ну, трое. Один ушёл к MR 333. Он теперь только про 3:00 говорит."]],post:[["d05","Четвёрка","Забирай дорогу. И… если увидишь нашего четвёртого — скажи, что мы его ждём."]]},
  {name:"Клиника 222-666",lvl:8,ids:["d13","d14","d15"],boss:true,pre:[["d15","Доктор 666","Добро пожаловать в клинику. Диагноз простой: ты слишком любопытный. Лечение — удаление."],["d14","Доктор 333","Шеф, может, не надо? Он же просто… считать умеет."],["d15","Доктор 666","Тихо. Г.Б.Т. слышит. Г.Б.Т. всегда слышит."]],post:[["d15","Доктор 666","Кх… Ты не понимаешь. Я не злодей. Я лишь пытался отсрочить третий час. Теперь иди к MR-ам. Они знают, где ключ."]]},
 ]},
 {ch:3,title:"Глава 3. Мистеры и Ночь",bg:"#3b2a6a",nodes:[
  {name:"Кибер-отряд",lvl:11,ids:["d08","d09","d20"],pre:[["d08","Кибер","СИСТЕМА: обнаружен Хранитель. Протокол 3:00 активирован. Уничтожить."]],post:[["d09","Кибер-Единица","Ошибка… ошибка… часы сброшены. Спасибо. Файл «ГБТ.log» скопирован тебе на карту."]]},
  {name:"Ночной кошмар",lvl:14,ids:["d03","d16","d18"],pre:[["d03","Двойка Ночи","Ночь — это когда цифры спят. А в три часа они просыпаются. Голодные."]],post:[["d16","Овца Ночи","Бе-е… мы просто хотели поспать. Теперь можно? MR 333 больше не звонит?"]]},
  {name:"Королевы",lvl:17,ids:["d11","d12","d21"],pre:[["d11","Королева","Хранитель. Мы знаем, зачем ты здесь. Г.Б.Т. — Гнев, Бесконечность, Тьма. Три имени одного существа."],["d12","Королева Ночи","Оно спит под островом. Мистеры — его будильник. Победи их всех — и оно проснётся. Или победи — и оно уснёт навсегда. Мы не знаем, что из двух."]],post:[["d11","Королева","Корона благословляет тебя. Дальше — Тёмный Легион."]]},
  {name:"Тёмный Легион",lvl:20,ids:["d10","d02","d24"],boss:true,pre:[["d10","Четвёрка-Сотона","Я тот самый четвёртый. Я ушёл к MR 333, потому что он показал мне правду: числа бесконечны, а бесконечность — это Тьма."]],post:[["d10","Четвёрка-Сотона","…Скажи братьям, что я вернусь. Когда всё закончится. Если закончится."]]},
 ]},
 {ch:4,title:"Глава 4. Третий час",bg:"#5a1212",nodes:[
  {name:"ДРЕВНИЙ УЖАС",lvl:25,ids:["d30","d31","d10"],pre:[["d30","Т-Рекс","РРРАААА! Я СПАЛ ТРИСТА ЛЕТ! КТО ЗАВЁЛ ЭТИ ЧАСЫ?!"]],post:[["d31","Легенда","Хранитель… время почти вышло. Часы на башне показывают 2:59."]]},
  {name:"Серафим и Тиран",lvl:30,ids:["d59","d63","d75"],pre:[["d75","MR 666","Шесть-шесть-шесть. Ты дошёл. Никто не доходил. Г.Б.Т. уже здесь — под твоими ногами."],["d59","Шестёрка Серафим","Мы — последняя стража. Проходи через нас — и встреть его."]],post:[["d75","MR 666","…3:00. Слышишь? Оно проснулось."]]},
  {name:"Г.Б.Т.",lvl:34,ids:["d109","d71","d93"],boss:true,final:true,music:"gbt",pre:[["d109","Г.Б.Т.","ГНЕВ. БЕСКОНЕЧНОСТЬ. ТЬМА."],["d71","MR 333","Алло, Хранитель. Три часа. Я же говорил, что позвоню."],["d93","Профессор 666","Лекция окончена. Экзамен — сейчас. Тема: конец света."],["d109","Г.Б.Т.","ВСЕ ЧАСЫ ПОКАЗЫВАЮТ 3:00. НАВСЕГДА."]],post:[["d109","Г.Б.Т.","…н-невозможно… число… которое… больше… бесконечности…"],["d00","Единица","Один. Всегда есть один. Хранитель, ты — тот самый один."],["d19","Кот","Мяу. Часы показывают 3:01. Остров спасён. Пока что."]]},
 ]},
];
const CAMPAIGN_NODES=CAMPAIGN.flatMap(c=>c.nodes.map(n=>({...n,ch:c.ch})));

// ---- фоны (assets/bg) ----
const HAB_BG={night:"nightmare_hall",glitch:"darknet",clock:"ice_hell",cyber:"base",digit:"room1",royal:"gallery",sheep:"snow",bird:"skyship",beast:"darkside",cat:"room1",doc:"base",money:"gallery",zodiac:"skyship"};
const BATTLE_BG={default:"versus",pvp:"versus",phone:"ice_hell",zodiac:"skyship",dungeon:"nightmare1",campaign:{1:"snow",2:"base",3:"nightmare_hall",4:"nightmare2"},boss:"darkside",final:"nightmare0"};
