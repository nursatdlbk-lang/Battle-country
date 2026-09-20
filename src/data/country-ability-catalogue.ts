import type { CountryId } from './countries';

export type CountryAbilityCatalogueEntry = {
  readonly id: CountryId;
  readonly name: { readonly ru: string; readonly en: string };
  readonly basicAttack: { readonly ru: string; readonly en: string };
  readonly ultimate: { readonly name: { readonly ru: string; readonly en: string }; readonly effect: { readonly ru: string; readonly en: string } };
};

const entry = (id: CountryId, ru: string, en: string, basicRu: string, basicEn: string, ultimateRu: string, ultimateEn: string, effectRu: string, effectEn: string): CountryAbilityCatalogueEntry => ({
  id, name: { ru, en }, basicAttack: { ru: basicRu, en: basicEn }, ultimate: { name: { ru: ultimateRu, en: ultimateEn }, effect: { ru: effectRu, en: effectEn } },
});

/** UI copy kept separate from gameplay country definitions so it cannot change combat rules. */
export const COUNTRY_ABILITY_CATALOGUE: readonly CountryAbilityCatalogueEntry[] = [
  entry('kz', 'Казахстан', 'Kazakhstan', 'Вращающаяся степная шашка', 'Spinning Steppe Shashka', 'Степной беркут', 'Steppe Golden Eagle', 'Призывает беркута на 5 с: он совершает заметные атаки по 42 урона каждые 1,35 с.', 'Summons an eagle for 5 s; it performs visible 42-damage strikes every 1.35 s.'),
  entry('ru', 'Россия', 'Russia', 'Бердыш', 'Bardiche', 'Морозный круг', 'Frost Circle', 'Создаёт вокруг себя зону радиусом 180 на 5 с, наносящую 28 урона в секунду.', 'Creates a radius-180 zone for 5 s that deals 28 damage per second.'),
  entry('ua', 'Украина', 'Ukraine', 'Казацкая сабля', 'Cossack Sabre', 'Казацкий вихрь', 'Cossack Whirlwind', 'Рывок на 0,85 с: скорость ×3, неуязвимость и 72 урона противнику.', 'A 0.85 s dash: 3× velocity, invulnerability, and 72 damage to the opponent.'),
  entry('us', 'США', 'United States', 'Прицельный револьвер', 'Aimed Revolver', 'Залп фронтира', 'Frontier Barrage', 'Наводит револьвер на цель и выпускает направленный веер из 12 пуль по 22 урона.', 'Aims the revolver at the target and fires a directed fan of 12 bullets for 22 damage each.'),
  entry('ca', 'Канада', 'Canada', 'Лесорубный топор', 'Lumberjack Axe', 'Северное сияние', 'Northern Lights', 'Даёт 160 щита и лечит до 70 HP.', 'Grants 160 shield and heals up to 70 HP.'),
  entry('mx', 'Мексика', 'Mexico', 'Макуауитль', 'Macuahuitl', 'Солнечный камень', 'Sun Stone', 'Помечает цель и через 0,8 с обрушивает солнечный камень на 110 урона.', 'Marks the target and drops a Sun Stone after 0.8 s for 110 damage.'),
  entry('br', 'Бразилия', 'Brazil', 'Возвращающийся энергомяч', 'Returning Energy Ball', 'Карнавальный каскад', 'Carnival Cascade', 'Выпускает дугу из 6 энергомячей по 26 урона; каждый возвращается к владельцу.', 'Fires an arc of 6 energy balls for 26 damage each; every ball returns to its owner.'),
  entry('ar', 'Аргентина', 'Argentina', 'Болас', 'Bolas', 'Рывок пампасов', 'Pampas Charge', 'Рывок на 0,85 с: скорость ×3, неуязвимость и 72 урона противнику.', 'A 0.85 s dash: 3× velocity, invulnerability, and 72 damage to the opponent.'),
  entry('gb', 'Великобритания', 'United Kingdom', 'Английский длинный лук', 'English Longbow', 'Экскалибур', 'Excalibur', 'Мгновенно наносит противнику 82 урона.', 'Instantly deals 82 damage to the opponent.'),
  entry('fr', 'Франция', 'France', 'Рапира', 'Rapier', 'Три мушкетёра', 'Three Musketeers', 'Три мушкетёра одновременно выпускают 3 снаряда по 34 урона.', 'Three musketeers fire 3 simultaneous projectiles for 34 damage each.'),
  entry('de', 'Германия', 'Germany', 'Цвайхендер', 'Zweihander', 'Заводной форсаж', 'Clockwork Overdrive', 'На 2 с ускоряет движение в 1,6 раза и даёт 80 щита.', 'Grants 1.6× movement speed for 2 s and 80 shield.'),
  entry('it', 'Италия', 'Italy', 'Римский гладиус', 'Roman Gladius', 'Легион', 'Legion', 'Легионный рывок ускоряет бойца в 2,4 раза на 0,65 с и наносит 88 урона.', 'A legion charge grants 2.4× speed for 0.65 s and deals 88 damage.'),
  entry('es', 'Испания', 'Spain', 'Толедский клинок', 'Toledo Blade', 'Залп Армады', 'Armada Barrage', 'Выпускает 5 снарядов Армады по 28 урона.', 'Fires 5 Armada projectiles dealing 28 damage each.'),
  entry('gr', 'Греция', 'Greece', 'Копьё-дори', 'Dory Spear', 'Эгида Олимпа', 'Aegis of Olympus', 'Даёт 160 щита и лечит до 70 HP.', 'Grants 160 shield and heals up to 70 HP.'),
  entry('tr', 'Турция', 'Turkey', 'Ятаган', 'Yatagan', 'Великая бомбарда', 'Great Bombard', 'Делает тяжёлый залп из 3 ядер по 45 урона.', 'Fires a heavy volley of 3 cannonballs for 45 damage each.'),
  entry('eg', 'Египет', 'Egypt', 'Хопеш', 'Khopesh', 'Пески времени', 'Sands of Time', 'На 2 с ускоряет движение в 1,6 раза и даёт 80 щита.', 'Grants 1.6× movement speed for 2 s and 80 shield.'),
  entry('ma', 'Марокко', 'Morocco', 'Сабля нимча', 'Nimcha Sabre', 'Буря Атласа', 'Atlas Storm', 'Буря выпускает 4 заметных заряда по 32 урона.', 'The storm releases 4 visible charges for 32 damage each.'),
  entry('ng', 'Нигерия', 'Nigeria', 'Меч ида', 'Ida Sword', 'Ритм силы', 'Rhythm of Power', 'Мгновенно наносит противнику 82 урона.', 'Instantly deals 82 damage to the opponent.'),
  entry('za', 'Южная Африка', 'South Africa', 'Копьё ассегай', 'Assegai Spear', 'Алмазная призма', 'Diamond Prism', 'Даёт 160 щита и лечит до 70 HP.', 'Grants 160 shield and heals up to 70 HP.'),
  entry('sa', 'Саудовская Аравия', 'Saudi Arabia', 'Арабский саиф', 'Arabian Saif', 'Пустынный мираж', 'Desert Mirage', 'Даёт 120 щита и мгновенно переносит бойца в противоположную точку поля.', 'Grants 120 shield and instantly relocates the fighter to the opposite side of the arena.'),
  entry('in', 'Индия', 'India', 'Возвращающийся чакрам', 'Returning Chakram', 'Мандала чакрамов', 'Chakram Mandala', 'Бросает направленный веер из 8 чакрамов по 24 урона и ждёт их возвращения.', 'Throws a directed fan of 8 chakrams for 24 damage each and waits for their return.'),
  entry('pk', 'Пакистан', 'Pakistan', 'Талвар', 'Talwar', 'Полёт шахина', 'Shaheen Flight', 'Рывок на 0,85 с: скорость ×3, неуязвимость и 72 урона противнику.', 'A 0.85 s dash: 3× velocity, invulnerability, and 72 damage to the opponent.'),
  entry('cn', 'Китай', 'China', 'Гуаньдао', 'Guandao', 'Небесный дракон', 'Celestial Dragon', 'Небесный дракон наносит один мощный удар на 96 урона.', 'The Celestial Dragon performs one powerful 96-damage strike.'),
  entry('jp', 'Япония', 'Japan', 'Вращающаяся катана', 'Spinning Katana', 'Тень ниндзя', 'Ninja Shadow', 'На 1,6 с даёт скрытность, неуязвимость и подготовку выпуска сюрикенов.', 'For 1.6 s grants stealth, invulnerability, and prepares a shuriken release.'),
  entry('kr', 'Южная Корея', 'South Korea', 'Меч хвандо', 'Hwando Sword', 'Хвача', 'Hwacha', 'Помечает цель и через 0,8 с наносит один залп на 104 урона.', 'Marks the target and delivers one 104-damage volley after 0.8 s.'),
  entry('th', 'Таиланд', 'Thailand', 'Парные мечи дааб', 'Twin Daab Swords', 'Муссон', 'Monsoon', 'Муссон обрушивает один заметный удар на 76 урона.', 'The monsoon delivers one visible 76-damage impact.'),
  entry('id', 'Индонезия', 'Indonesia', 'Крис', 'Kris', 'Шторм Гаруды', 'Garuda Storm', 'Гаруда совершает рывок: скорость ×2,7 на 0,7 с и 80 урона.', 'Garuda performs a charge: 2.7× speed for 0.7 s and 80 damage.'),
  entry('vn', 'Вьетнам', 'Vietnam', 'Бамбуковое копьё', 'Bamboo Spear', 'Волшебный арбалет', 'Magic Crossbow', 'Волшебный арбалет выпускает 5 стрел по 30 урона.', 'The Magic Crossbow fires 5 bolts for 30 damage each.'),
  entry('mn', 'Монголия', 'Mongolia', 'Составной лук', 'Composite Bow', 'Призрачная конница', 'Ghost Cavalry', 'Призрачная конница выпускает 7 стрел по 25 урона.', 'The Ghost Cavalry releases 7 arrows for 25 damage each.'),
  entry('au', 'Австралия', 'Australia', 'Возвращающийся бумеранг', 'Returning Boomerang', 'Южный Крест', 'Southern Cross', 'Через 0,8 с Южный Крест наносит один яркий удар на 104 урона.', 'After 0.8 s, the Southern Cross delivers one bright 104-damage strike.'),
  entry('nz', 'Новая Зеландия', 'New Zealand', 'Клинок серебряного папоротника', 'Silver Fern Blade', 'Ветер Аотеароа', 'Wind of Aotearoa', 'Мгновенно наносит противнику 82 урона.', 'Instantly deals 82 damage to the opponent.'),
  entry('no', 'Норвегия', 'Norway', 'Топор викинга', 'Viking Axe', 'Корабль фьордов', 'Fjord Ship', 'Рывок на 0,85 с: скорость ×3, неуязвимость и 72 урона противнику.', 'A 0.85 s dash: 3× velocity, invulnerability, and 72 damage to the opponent.'),
] as const;
