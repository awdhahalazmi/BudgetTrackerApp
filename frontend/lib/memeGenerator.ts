// Encodes text for memegen.link URL path segments.
// Spaces → _ , / → ~s , ? → ~q , # → ~h , % → ~p
function enc(text: string): string {
  return text
    .replace(/%/g, '~p')
    .replace(/#/g, '~h')
    .replace(/\?/g, '~q')
    .replace(/\//g, '~s')
    .replace(/ /g, '_')
    .replace(/&/g, 'and')
}

function memeUrl(template: string, ...lines: string[]) {
  const segments = lines.map(enc).join('/')
  return `https://api.memegen.link/images/${template}/${segments}.png`
}

// Offset pick by `variant` so the same expense cycles through different memes.
function pick<T>(arr: T[], seed: string, variant: number): T {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return arr[(hash + variant) % arr.length]
}

interface MemeResult { url: string }

// Verified template IDs (all return 200 from api.memegen.link):
// drake, fry, doge, fine, harold, rollsafe, gru, db, success,
// both, buzz, money, wallet, sadfrog, regret, blb, yuno, noidea, cryingfloor

export function generateMeme(title: string, amount: number, categoryName: string, variant = 0, expenseId = ''): MemeResult {
  const t = title.toLowerCase()
  const cat = categoryName.toLowerCase()
  // Include expenseId so different expenses always get different memes
  // even when title / amount / category are identical
  const seed = title + String(amount) + categoryName + expenseId
  const $ = `${amount} KD`

  // ── Coffee / Drinks ──
  if (/coffee|latte|espresso|starbucks|cappuccino|boba|bubble tea|tea/.test(t)) {
    const opts = [
      memeUrl('drake', 'Saving money', `Spending ${$} on ${title}`),
      memeUrl('fry', 'Not sure if broke', `Or just really like ${title}`),
      memeUrl('rollsafe', "Can't feel guilty about coffee", 'if you call it a productivity expense'),
      memeUrl('harold', `${$} on ${title}`, 'It fuels my soul'),
      memeUrl('fine', `${$} coffee every day`, 'This is fine'),
      memeUrl('money', `${title}`, `Shut up and take my ${$}`),
      memeUrl('sadfrog', `Made coffee at home once`, `Still spent ${$} at the cafe`),
      memeUrl('blb', `Tries to save money`, `Buys ${$} ${title} on the way`),
    ]
    return { url: pick(opts, seed, variant) }
  }

  // ── Food / Restaurants ──
  if (/lunch|dinner|breakfast|food|eat|restaurant|burger|pizza|sushi|mcdo|kfc|taco|subway|shawarma|kebab|noodle|ramen|meal/.test(t)) {
    const opts = [
      memeUrl('fine', `Spent ${$} on ${title}`, 'This is fine'),
      memeUrl('drake', 'Cooking at home', `Ordering ${title} for ${$}`),
      memeUrl('harold', `${$} on ${title}`, 'Totally worth it'),
      memeUrl('doge', `much ${title}`, `such ${$} wow`),
      memeUrl('fry', 'Not sure if hungry', `Or just bored and spent ${$}`),
      memeUrl('rollsafe', "Can't cook at home", 'if the restaurant is right there'),
      memeUrl('money', title, `Shut up and take my ${$}`),
      memeUrl('sadfrog', 'Said I would meal prep', `Spent ${$} on ${title} instead`),
    ]
    return { url: pick(opts, seed, variant) }
  }

  // ── Groceries ──
  if (/grocer|market|supermarket|walmart|whole foods|costco|safeway/.test(t) || /grocer/.test(cat)) {
    const opts = [
      memeUrl('gru', `Go to store for milk`, `Spend ${$}`, `Spend ${$}`, `Somehow still no milk`),
      memeUrl('drake', 'Buying only what I need', `Spending ${$} at the store`),
      memeUrl('both', `Stick to the list`, `Buy everything in sight`),
      memeUrl('fine', `${$} grocery run`, 'I only needed bread'),
      memeUrl('harold', `Spent ${$} on groceries`, 'I have no idea what I bought'),
      memeUrl('buzz', 'Coupons', 'Coupons everywhere but still spent ${$}'),
      memeUrl('noidea', `Walked out with ${$} worth of groceries`, 'I have no idea what I bought'),
      memeUrl('blb', `Makes a grocery list`, `Buys ${$} of random things`),
    ]
    return { url: pick(opts, seed, variant) }
  }

  // ── Streaming / Subscriptions ──
  if (/netflix|spotify|hulu|disney|apple tv|youtube|hbo|prime video|subscription|streaming/.test(t)) {
    const opts = [
      memeUrl('fry', 'Not sure if watching', 'Or just paying for comfort'),
      memeUrl('drake', 'Cancelling subscriptions', `Renewing ${title} for ${$}`),
      memeUrl('sadfrog', `Paying ${$} for ${title}`, 'Still watching the same 3 shows'),
      memeUrl('rollsafe', "Can't waste time", `if you pay ${$} for ${title} you never watch`),
      memeUrl('harold', `${$} on ${title}`, 'I watch one show on loop'),
      memeUrl('fine', `Another ${$} subscription`, 'This is fine'),
      memeUrl('blb', `Subscribes to ${title}`, `Watches it twice then forgets`),
      memeUrl('cryingfloor', `${title} auto-renewed for ${$}`, ''),
    ]
    return { url: pick(opts, seed, variant) }
  }

  // ── Ride / Transport ──
  if (/uber|lyft|taxi|cab|grab|bolt|careem|ride|transport/.test(t)) {
    const opts = [
      memeUrl('drake', 'Walking 10 minutes', `Taking ${title} for ${$}`),
      memeUrl('rollsafe', "Can't be late", `if you spend ${$} on a ride`),
      memeUrl('fry', 'Not sure if lazy', `Or just worth ${$}`),
      memeUrl('fine', `${$} surge pricing`, 'This is fine'),
      memeUrl('harold', `Paid ${$} for ${title}`, 'My legs still work'),
      memeUrl('sadfrog', `Said I would walk more`, `Spent ${$} on ${title}`),
      memeUrl('blb', 'Opens maps to walk', `Calls ${title} for ${$} instead`),
      memeUrl('yuno', `Y U NO`, `just walk and save ${$}`),
    ]
    return { url: pick(opts, seed, variant) }
  }

  // ── Gas / Fuel ──
  if (/gas|petrol|fuel|shell|pump/.test(t)) {
    const opts = [
      memeUrl('fine', `Gas just cost ${$}`, 'This is fine'),
      memeUrl('harold', `Paid ${$} for gas`, 'Worth every drop'),
      memeUrl('drake', 'Buying an electric car', `Paying ${$} for gas again`),
      memeUrl('sadfrog', `Filled up for ${$}`, 'Feels bad man'),
      memeUrl('wallet', `${$} at the pump`, ''),
      memeUrl('fry', 'Not sure if the economy', `Or just always this expensive`),
    ]
    return { url: pick(opts, seed, variant) }
  }

  // ── Shopping / Clothes ──
  if (/shop|cloth|shirt|shoes|amazon|zara|nike|adidas|fashion|outfit|jacket|pants|dress/.test(t)) {
    const opts = [
      memeUrl('drake', 'Saving money this month', `Buying ${title} for ${$}`),
      memeUrl('both', 'Stick to the budget', `Buy the ${title}`),
      memeUrl('db', 'My wallet', `${title} for ${$}`),
      memeUrl('rollsafe', "Can't overspend", "if everything you buy is a 'necessity'"),
      memeUrl('harold', `Spent ${$} on ${title}`, 'I needed this'),
      memeUrl('fry', `Not sure if I needed ${title}`, `Or just wanted to spend ${$}`),
      memeUrl('money', title, 'Shut up and take my money'),
      memeUrl('regret', `Bought ${title} for ${$}`, ''),
    ]
    return { url: pick(opts, seed, variant) }
  }

  // ── Gaming ──
  if (/game|gaming|steam|playstation|xbox|nintendo|app store|google play|dlc/.test(t)) {
    const opts = [
      memeUrl('rollsafe', `Can't feel bad about ${$}`, 'if it was on sale'),
      memeUrl('drake', 'Going outside', `Spending ${$} on ${title}`),
      memeUrl('fry', `Just spent ${$} on ${title}`, 'No regrets'),
      memeUrl('fine', `${$} on games`, 'I deserve this'),
      memeUrl('sadfrog', 'Has 300 unfinished games', `Buys another one for ${$}`),
      memeUrl('blb', `Buys ${title} for ${$}`, 'Plays for 20 minutes, never opens again'),
      memeUrl('harold', `${$} on ${title}`, 'It was on my wishlist for 2 years'),
      memeUrl('regret', `${$} on ${title}`, ''),
    ]
    return { url: pick(opts, seed, variant) }
  }

  // ── Rent / Housing ──
  if (/rent|lease|mortgage|landlord|apartment|housing/.test(t) || /housing|rent/.test(cat)) {
    const opts = [
      memeUrl('fine', `Paid ${$} in rent`, 'This is fine'),
      memeUrl('sadfrog', `${$} rent this month`, 'Feels bad man'),
      memeUrl('harold', `${$} rent`, 'At least I have a roof'),
      memeUrl('drake', 'Owning a home', `Paying ${$} rent forever`),
      memeUrl('cryingfloor', `Rent went up to ${$}`, ''),
      memeUrl('wallet', `Rent: ${$}`, ''),
    ]
    return { url: pick(opts, seed, variant) }
  }

  // ── Gym / Health ──
  if (/gym|fitness|health|workout|protein|supplement|doctor|pharmacy|medicine/.test(t)) {
    const opts = [
      memeUrl('drake', 'Actually going to the gym', `Paying ${$} for the membership`),
      memeUrl('rollsafe', "Can't be unhealthy", `if you pay ${$} for a gym you never go to`),
      memeUrl('fry', 'Not sure if healthy', `Or just ${$} poorer`),
      memeUrl('harold', `${$} on ${title}`, 'I went twice this month'),
      memeUrl('blb', `Buys ${$} gym membership`, 'Goes once in January'),
      memeUrl('sadfrog', `${$} gym membership`, 'Exercises at home for free anyway'),
    ]
    return { url: pick(opts, seed, variant) }
  }

  // ── Travel / Hotels ──
  if (/hotel|flight|airbnb|travel|trip|vacation|booking/.test(t)) {
    const opts = [
      memeUrl('drake', 'Saving money', `Booking a trip for ${$}`),
      memeUrl('harold', `Spent ${$} on ${title}`, 'I needed a break'),
      memeUrl('fine', `${$} vacation`, 'I can totally afford this'),
      memeUrl('sadfrog', `${$} on travel`, 'Back to work Monday'),
      memeUrl('money', title, `Shut up and take my ${$}`),
      memeUrl('fry', 'Not sure if relaxed', `Or just ${$} poorer`),
    ]
    return { url: pick(opts, seed, variant) }
  }

  // ── Amount-based fallbacks ──

  if (amount >= 500) {
    const opts = [
      memeUrl('fine', `Spent ${$} on ${title}`, 'Everything is fine'),
      memeUrl('harold', `${$} for ${title}`, 'No big deal'),
      memeUrl('cryingfloor', `${$} gone`, `just like that`),
      memeUrl('drake', 'Having an emergency fund', `Spending ${$} on ${title}`),
      memeUrl('sadfrog', `${$} on ${title}`, 'Feels bad man'),
      memeUrl('wallet', `${$} on ${title}`, ''),
      memeUrl('regret', `Spent ${$} on ${title}`, ''),
    ]
    return { url: pick(opts, seed, variant) }
  }

  if (amount >= 100) {
    const opts = [
      memeUrl('drake', 'Having savings', `Spending ${$} on ${title}`),
      memeUrl('both', `Save ${$}`, `Spend it on ${title}`),
      memeUrl('gru', `Make a budget`, `Budget says no to ${title}`, `Spends ${$} anyway`, `Spends ${$} anyway`),
      memeUrl('harold', `${$} on ${title}`, 'Totally in the plan'),
      memeUrl('rollsafe', "Can't go over budget", "if you don't have a budget"),
      memeUrl('fry', `Not sure if ${title} was necessary`, `Or just wanted to spend ${$}`),
    ]
    return { url: pick(opts, seed, variant) }
  }

  if (amount < 5) {
    const opts = [
      memeUrl('success', `Only spent ${$}`, 'I am fiscally responsible'),
      memeUrl('doge', `only ${$}`, 'such saving wow'),
      memeUrl('rollsafe', "Can't go broke", `if you only spend ${$}`),
      memeUrl('fry', 'Not sure if saving money', `Or just too cheap to spend more than ${$}`),
    ]
    return { url: pick(opts, seed, variant) }
  }

  // ── Generic fallback ──
  const fallbacks = [
    memeUrl('drake', 'Sticking to my budget', `${title} - ${$}`),
    memeUrl('fry', `Not sure if I needed ${title}`, `Or just wanted to spend ${$}`),
    memeUrl('rollsafe', "Can't overspend", 'if you stop checking your balance'),
    memeUrl('harold', `${$} on ${title}`, 'Totally planned this'),
    memeUrl('doge', `much ${title}`, `very ${$} wow`),
    memeUrl('fine', `${title} - ${$}`, 'My bank account is fine'),
    memeUrl('sadfrog', `${$} on ${title}`, 'Feels bad man'),
    memeUrl('both', 'Save money', `Spend ${$} on ${title}`),
    memeUrl('blb', `Tries to save money`, `Spends ${$} on ${title}`),
    memeUrl('yuno', 'Y U NO', `save ${$} instead`),
    memeUrl('wallet', `${$} on ${title}`, ''),
    memeUrl('noidea', `Spent ${$} on ${title}`, 'I have no idea what I am doing'),
  ]
  return { url: pick(fallbacks, seed, variant) }
}
