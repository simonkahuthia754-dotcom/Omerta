# Image and name clean-up (legal risk)

This is a risk checklist, not legal advice. The code cannot tell where a picture came from, so the owner has to confirm each source.

## Removed or fixed
- Market Street, Old Quarter and Tokyo: the earlier photos (identifiable woman, watermark) were replaced with clean AI-generated scenes.
- `biz-pawn` (Gold & Pawn): a real pawn shop with its real phone numbers and card-scheme logos. Removed.
- `biz-corner`: Coca-Cola and newspaper logos blurred. The shop sign still shows a real shop name.
- `biz-laundromat`: review-site logo blurred.
- `item-revolver`: maker name and serial number blurred.
- "Fidelity Savings" renamed "Ferrante Savings" (Fidelity is a real financial brand).

## Still needs a decision from the owner
- **Where each picture came from.** Photos found on the web (towns and cities, shop fronts, hotels, blade, revolver, sports car, necklace, watch, cigars, whisky, chips, yacht shots) are normally copyrighted by the photographer, even without a watermark. Keep a licence, receipt or screenshot of the licence page for each, or replace them with pictures you made or bought. Pictures you generated yourself (badges, passport cards, characters, offices, houses) are lower risk, but read the generator's terms for commercial use.
- **The word "Mafia".** The passport card pictures, `logo.png` and `favicon.png` say "MAFIA". That is a registered video-game trademark. Avoid it in the app name and store listing, and ideally regenerate those pictures.
- **The name "Omertà".** Other games use it. Run a trademark search in the countries you publish in before launch.
- **Real buildings and cars.** The Las Vegas hotel photos and the red sports car show real, recognisable brands. Low risk in a game, but replace them if a rights holder complains.
- **Privacy policy.** Chat, player ids and sign-in go through Firebase. Google Play requires a privacy policy and a data-safety form.
- **Git history.** Removed pictures stay in earlier commits. If a picture must vanish completely, rewrite history or recreate the repository.

## Unsplash photos (free Unsplash licence, fetched at build time by scripts/fetch-unsplash.sh)
Canberra Parliament House (Marcus Reubenstein), Fuji (Filiz Elaerts), Colosseum (Matteo del Piano), Paris (Ali Rizvi), Rio (Davi Costa), Kenya (Thomas Bennie), Amsterdam (Gaurav Jain), Dubai (Wael Hneini), Zanzibar (Mulberry Digital), Thai islands (Miltiadis Fragkidis), Norway fjord (Danny Rienecker), Caribbean (Shelby Cohron), Grand Canyon (Tim Hart), Hong Kong (Dan Freeman), Patagonia (Karla Robinson), Africa (Sweder Breet), Sydney (Caleb), Antarctica (Derek Oyen), Earth (ostudio). All on unsplash.com.
