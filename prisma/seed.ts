import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../app/generated/prisma/client";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const img = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=600&h=800&fit=crop&crop=faces,entropy&q=80`;

// keyword-based Unsplash (always returns a real photo, stable per sig number)
const src = (keywords: string, sig: number) =>
  `https://source.unsplash.com/600x800/?${keywords}&sig=${sig}`;

async function main() {
  // 1. Remove products without images (clear cart items first)
  const noImageProducts = await prisma.product.findMany({ where: { imageUrl: null }, select: { id: true } });
  const noImageIds = noImageProducts.map((p: { id: string }) => p.id);
  if (noImageIds.length > 0) {
    await prisma.cartItem.deleteMany({
      where: { variant: { productId: { in: noImageIds } } },
    });
  }
  const deleted = await prisma.product.deleteMany({ where: { imageUrl: null } });
  console.log(`Deleted ${deleted.count} products without images.`);

  // 2. Upsert taxonomy
  const [majice, hlace, jakne, obleke, puloverji, srajce, jopici, kape, tshirt] = await Promise.all([
    prisma.category.upsert({ where: { slug: "majice" }, update: {}, create: { name: "Majice", slug: "majice" } }),
    prisma.category.upsert({ where: { slug: "hlace" }, update: {}, create: { name: "Hlace", slug: "hlace" } }),
    prisma.category.upsert({ where: { slug: "jakne" }, update: {}, create: { name: "Jakne", slug: "jakne" } }),
    prisma.category.upsert({ where: { slug: "obleke" }, update: {}, create: { name: "Obleke", slug: "obleke" } }),
    prisma.category.upsert({ where: { slug: "puloverji" }, update: {}, create: { name: "Puloverji", slug: "puloverji" } }),
    prisma.category.upsert({ where: { slug: "srajce" }, update: {}, create: { name: "Srajce", slug: "srajce" } }),
    prisma.category.upsert({ where: { slug: "jopici" }, update: {}, create: { name: "Jopici", slug: "jopici" } }),
    prisma.category.upsert({ where: { slug: "kape" }, update: {}, create: { name: "Kape", slug: "kape" } }),
    prisma.category.upsert({ where: { slug: "t-shirt" }, update: {}, create: { name: "T-Shirt", slug: "t-shirt" } }),
  ]);

  const [pomlad, poletje, jesen, zima] = await Promise.all([
    prisma.season.upsert({ where: { slug: "pomlad" }, update: {}, create: { name: "Pomlad", slug: "pomlad" } }),
    prisma.season.upsert({ where: { slug: "poletje" }, update: {}, create: { name: "Poletje", slug: "poletje" } }),
    prisma.season.upsert({ where: { slug: "jesen" }, update: {}, create: { name: "Jesen", slug: "jesen" } }),
    prisma.season.upsert({ where: { slug: "zima" }, update: {}, create: { name: "Zima", slug: "zima" } }),
  ]);

  const [moski, zenske, otroci] = await Promise.all([
    prisma.audience.upsert({ where: { slug: "moski" }, update: { name: "Moški" }, create: { name: "Moški", slug: "moski" } }),
    prisma.audience.upsert({ where: { slug: "zenske" }, update: { name: "Ženske" }, create: { name: "Ženske", slug: "zenske" } }),
    prisma.audience.upsert({ where: { slug: "otroci" }, update: { name: "Otroci" }, create: { name: "Otroci", slug: "otroci" } }),
  ]);

  // Size helpers
  const SIZES_ADULT = ["XS", "S", "M", "L", "XL", "XXL"];
  const SIZES_KIDS  = ["104", "110", "116", "122", "128", "134", "140"];
  const SIZES_UNI   = ["UNI"];

  function sizesFor(audienceId: string, categoryId: string): string[] {
    if (categoryId === kape.id) return SIZES_UNI;
    if (audienceId === otroci.id) return SIZES_KIDS;
    return SIZES_ADULT;
  }

  function stockPerSize(totalStock: number, numSizes: number): number[] {
    const base = Math.floor(totalStock / numSizes);
    const rem  = totalStock % numSizes;
    return Array.from({ length: numSizes }, (_, i) => base + (i < rem ? 1 : 0));
  }

  // 3. Products
  const products = [
    // ── MOŠKI ──────────────────────────────────────────────────────────────
    {
      slug: "m-bela-lanena-srajca", name: "Bela lanena srajca",
      description: "Lahkotna lanena srajca za vroče poletne dni. Sproščen kroj, naravni material.",
      priceCents: 5900, compareAtPriceCents: null, stock: 12,
      imageUrl: img("1598033129183-c4f50c736f10"),
      categoryId: srajce.id, seasonId: poletje.id, audienceId: moski.id,
    },
    {
      slug: "m-chino-hlace-navy", name: "Navy chino hlače",
      description: "Klasične chino hlače iz bombažne mešanice. Primerne za pisarno in prosti čas.",
      priceCents: 7900, compareAtPriceCents: 9900, stock: 8,
      imageUrl: src("man,chino,pants,fashion", 1),
      categoryId: hlace.id, seasonId: jesen.id, audienceId: moski.id,
    },
    {
      slug: "m-oversize-crna-majica", name: "Oversize črna majica",
      description: "Udobna oversize majica iz 100% organskega bombaža.",
      priceCents: 2900, compareAtPriceCents: null, stock: 25,
      // man in black oversize shirt
      imageUrl: img("1583743814966-8936f5b7be1a"),
      categoryId: majice.id, seasonId: poletje.id, audienceId: moski.id,
    },
    {
      slug: "m-zimska-parka", name: "Zimska parka",
      description: "Topla zimska parka s kapuco in polnjenjem iz recikliranega poliestra.",
      priceCents: 22900, compareAtPriceCents: 27900, stock: 3,
      // man in winter parka
      imageUrl: img("1548126032-079a0fb0099d"),
      categoryId: jakne.id, seasonId: zima.id, audienceId: moski.id,
    },
    {
      slug: "m-merino-pulover-siv", name: "Sivi merino pulover",
      description: "Mehak pulover iz merino volne. Naravno termoregulatorno vlakno.",
      priceCents: 12900, compareAtPriceCents: null, stock: 10,
      imageUrl: src("man,grey,sweater,knit", 2),
      categoryId: puloverji.id, seasonId: jesen.id, audienceId: moski.id,
    },
    {
      slug: "m-polo-bela", name: "Bela polo majica",
      description: "Klasična polo majica iz pique bombaža. Primerna za vsako priložnost.",
      priceCents: 4500, compareAtPriceCents: null, stock: 18,
      // man in white polo shirt
      imageUrl: img("1620799140408-edc6dcb6d633"),
      categoryId: majice.id, seasonId: poletje.id, audienceId: moski.id,
    },
    {
      slug: "m-suknjic-rjav", name: "Rjav suknjič",
      description: "Strukturiran suknjič v toplem rjavem odtenku. Popoln za pisarniško okolje.",
      priceCents: 16900, compareAtPriceCents: 21900, stock: 4,
      // man in brown blazer/suit
      imageUrl: img("1507679799987-c73779587ccf"),
      categoryId: jakne.id, seasonId: jesen.id, audienceId: moski.id,
    },
    {
      slug: "m-jogger-sivi", name: "Sivi jogger",
      description: "Udobne jogger hlače iz franceske piqué tkanine.",
      priceCents: 5900, compareAtPriceCents: null, stock: 15,
      // man in jogger pants
      imageUrl: img("1506629082955-511b1aa562c8"),
      categoryId: hlace.id, seasonId: pomlad.id, audienceId: moski.id,
    },
    {
      slug: "m-formalna-srajca-bela", name: "Formalna bela srajca",
      description: "Klasična formalna srajca iz poplin bombaža. Slim fit kroj.",
      priceCents: 6900, compareAtPriceCents: null, stock: 14,
      // man in formal white dress shirt
      imageUrl: img("1603252109303-2751441dd157"),
      categoryId: srajce.id, seasonId: pomlad.id, audienceId: moski.id,
    },
    {
      slug: "m-cargo-hlace-kaki", name: "Kaki cargo hlače",
      description: "Udobne cargo hlače z bočnimi žepi. Funkcionalne in stilske.",
      priceCents: 7200, compareAtPriceCents: null, stock: 16,
      imageUrl: src("man,cargo,khaki,pants", 3),
      categoryId: hlace.id, seasonId: jesen.id, audienceId: moski.id,
    },
    {
      slug: "m-tshirt-bel-basic", name: "Basic beli T-Shirt",
      description: "Nepogrešljiv beli T-shirt iz mehke jersey tkanine.",
      priceCents: 1900, compareAtPriceCents: null, stock: 35,
      // man in plain white t-shirt
      imageUrl: img("1521572163474-6864f9cf17ab"),
      categoryId: tshirt.id, seasonId: poletje.id, audienceId: moski.id,
    },
    {
      slug: "m-tshirt-crn-oversize", name: "Oversize črni T-Shirt",
      description: "Oversize kroj, 100% bombaž. Minimalistični videz.",
      priceCents: 2400, compareAtPriceCents: null, stock: 28,
      imageUrl: src("man,black,tshirt,oversize", 4),
      categoryId: tshirt.id, seasonId: poletje.id, audienceId: moski.id,
    },
    {
      slug: "m-hoodie-temnomodri", name: "Temnomodri hoodie",
      description: "Pulover s kapuco iz mehke franceske piqué tkanine.",
      priceCents: 6900, compareAtPriceCents: 8500, stock: 22,
      // man in dark navy hoodie
      imageUrl: img("1556821840-3a63f15732ce"),
      categoryId: jopici.id, seasonId: jesen.id, audienceId: moski.id,
    },
    {
      slug: "m-jeans-jakna-klasicna", name: "Klasična jeans jakna",
      description: "Brezčasna jeans jakna, regular fit.",
      priceCents: 11900, compareAtPriceCents: null, stock: 6,
      // man in denim jacket
      imageUrl: img("1551028719-00167b16eac5"),
      categoryId: jakne.id, seasonId: pomlad.id, audienceId: moski.id,
    },
    {
      slug: "m-turtleneck-crn", name: "Črni turtleneck",
      description: "Visokogrlni pulover iz volnene mešanice.",
      priceCents: 8900, compareAtPriceCents: null, stock: 9,
      // man in black turtleneck
      imageUrl: img("1608063615781-e2ef8c73d114"),
      categoryId: puloverji.id, seasonId: zima.id, audienceId: moski.id,
    },
    {
      slug: "m-kapa-temnosiva", name: "Temnosiva zimska kapa",
      description: "Pletena beanie kapa iz volnene mešanice.",
      priceCents: 2200, compareAtPriceCents: null, stock: 40,
      imageUrl: src("man,beanie,winter,hat", 5),
      categoryId: kape.id, seasonId: zima.id, audienceId: moski.id,
    },
    {
      slug: "m-prugasta-majica", name: "Prugasta majica",
      description: "Klasična mornarsko prugasta majica iz organskega bombaža.",
      priceCents: 3500, compareAtPriceCents: 4500, stock: 20,
      // man in striped shirt
      imageUrl: img("1588359348347-9bc6cbbb689e"),
      categoryId: majice.id, seasonId: pomlad.id, audienceId: moski.id,
    },
    {
      slug: "m-zimski-jopic-kapuca", name: "Zimski jopič s kapuco",
      description: "Topel jopič z zadrgo in kapuco iz flisa.",
      priceCents: 9900, compareAtPriceCents: null, stock: 11,
      imageUrl: src("man,hoodie,zip,winter", 6),
      categoryId: jopici.id, seasonId: zima.id, audienceId: moski.id,
    },

    // ── ŽENSKE ─────────────────────────────────────────────────────────────
    {
      slug: "z-zimska-jakna-crna", name: "Črna zimska jakna",
      description: "Topla jakna z volneno podlogo. Eleganten kroj za mestno nošenje.",
      priceCents: 18900, compareAtPriceCents: 24900, stock: 5,
      // woman in black winter coat
      imageUrl: img("1539533018447-63fcce2678e3"),
      categoryId: jakne.id, seasonId: zima.id, audienceId: zenske.id,
    },
    {
      slug: "z-midi-obleka-bez", name: "Bež midi obleka",
      description: "Elegantna midi obleka za posebne priložnosti ali vsakodnevno nošenje.",
      priceCents: 8900, compareAtPriceCents: null, stock: 7,
      // woman in beige midi dress
      imageUrl: img("1595777457583-95e059d581b8"),
      categoryId: obleke.id, seasonId: pomlad.id, audienceId: zenske.id,
    },
    {
      slug: "z-svilena-bluza", name: "Svilena bluza",
      description: "Nežna svilena bluza z rahlo prosojnim efektom.",
      priceCents: 11500, compareAtPriceCents: null, stock: 4,
      // woman in silk blouse
      imageUrl: img("1564257631407-4deb1f99d992"),
      categoryId: srajce.id, seasonId: poletje.id, audienceId: zenske.id,
    },
    {
      slug: "z-maxi-obleka-cvetlicna", name: "Maxi cvetlična obleka",
      description: "Lahkotna maxi obleka s cvetličnim vzorcem. Za plažo in poletne izlete.",
      priceCents: 7500, compareAtPriceCents: 9900, stock: 9,
      // woman in floral maxi dress
      imageUrl: img("1572804013309-59a88b7e92f1"),
      categoryId: obleke.id, seasonId: poletje.id, audienceId: zenske.id,
    },
    {
      slug: "z-delovne-hlace-sive", name: "Sive delovne hlače",
      description: "Ravne hlače z rahlim stretch efektom. Idealne za dolge delovne dneve.",
      priceCents: 8500, compareAtPriceCents: null, stock: 11,
      imageUrl: src("woman,grey,trousers,fashion", 7),
      categoryId: hlace.id, seasonId: jesen.id, audienceId: zenske.id,
    },
    {
      slug: "z-zimska-obleka-dolgi-rokavi", name: "Zimska pletena obleka",
      description: "Topla pletena obleka za zimske mesece. Dolgi rokavi in A-linija.",
      priceCents: 13500, compareAtPriceCents: null, stock: 5,
      // woman in knit winter dress
      imageUrl: img("1515372039744-b8f02a3ae446"),
      categoryId: obleke.id, seasonId: zima.id, audienceId: zenske.id,
    },
    {
      slug: "z-pleteni-kardigan", name: "Pleteni kardigan",
      description: "Mehki kardigan z gumbi iz naravne volne.",
      priceCents: 10900, compareAtPriceCents: 13900, stock: 7,
      // woman in knit cardigan
      imageUrl: img("1434389677669-e08b4cac3105"),
      categoryId: puloverji.id, seasonId: zima.id, audienceId: zenske.id,
    },
    {
      slug: "z-jesenski-plasc", name: "Kamelni jesenski plašč",
      description: "Klasičen kamelni plašč za jesensko in zimsko sezono.",
      priceCents: 28900, compareAtPriceCents: 35900, stock: 2,
      // woman in camel coat
      imageUrl: img("1578932750294-f5075e85f44a"),
      categoryId: jakne.id, seasonId: jesen.id, audienceId: zenske.id,
    },
    {
      slug: "z-jeans-jakna-kratka", name: "Kratka jeans jakna",
      description: "Klasična jeans jakna skrajšanega kroja.",
      priceCents: 11900, compareAtPriceCents: null, stock: 6,
      // woman in cropped denim jacket
      imageUrl: img("1591047139829-d91aecb6caea"),
      categoryId: jakne.id, seasonId: pomlad.id, audienceId: zenske.id,
    },
    {
      slug: "z-turtleneck-kremna", name: "Kremni turtleneck",
      description: "Visokogrlni pulover iz volnene mešanice. Toplo in elegantno.",
      priceCents: 9500, compareAtPriceCents: null, stock: 8,
      imageUrl: src("woman,turtleneck,cream,winter", 8),
      categoryId: puloverji.id, seasonId: zima.id, audienceId: zenske.id,
    },
    {
      slug: "z-tshirt-bela-basic", name: "Basic beli T-shirt",
      description: "Čist bel T-shirt iz organskega bombaža. Essential kos.",
      priceCents: 1900, compareAtPriceCents: null, stock: 30,
      // woman in basic white tshirt
      imageUrl: img("1503342217505-b0a15ec3261c"),
      categoryId: tshirt.id, seasonId: poletje.id, audienceId: zenske.id,
    },
    {
      slug: "z-tshirt-graficni-cvetlicni", name: "Cvetlični grafični T-shirt",
      description: "Mehak T-shirt s subtilnim cvetličnim tiskom.",
      priceCents: 2600, compareAtPriceCents: null, stock: 18,
      // woman in graphic floral tshirt
      imageUrl: img("1485968579580-fc6f49f65b15"),
      categoryId: tshirt.id, seasonId: poletje.id, audienceId: zenske.id,
    },
    {
      slug: "z-hoodie-roza", name: "Rožnati hoodie",
      description: "Mehak pulover s kapuco v nežni roza barvi.",
      priceCents: 6500, compareAtPriceCents: null, stock: 20,
      imageUrl: src("woman,pink,hoodie,fashion", 9),
      categoryId: jopici.id, seasonId: jesen.id, audienceId: zenske.id,
    },
    {
      slug: "z-lanene-hlace-bele", name: "Bele lanene hlače",
      description: "Široke hlače iz naravnega lanu. Elegantne in udobne.",
      priceCents: 7200, compareAtPriceCents: null, stock: 12,
      imageUrl: src("woman,linen,white,pants", 10),
      categoryId: hlace.id, seasonId: poletje.id, audienceId: zenske.id,
    },
    {
      slug: "z-mini-obleka-crna", name: "Črna mini obleka",
      description: "Klasična črna mini obleka iz jersey tkanine.",
      priceCents: 6900, compareAtPriceCents: 8900, stock: 9,
      // woman in black mini dress
      imageUrl: img("1515886657613-9f3515b0c78f"),
      categoryId: obleke.id, seasonId: pomlad.id, audienceId: zenske.id,
    },
    {
      slug: "z-srajca-prosojni-volanci", name: "Prosojnasrajca z volančki",
      description: "Romantična bluza z volančki. Lahkotna in ženstven.",
      priceCents: 5900, compareAtPriceCents: null, stock: 8,
      // woman in ruffled blouse
      imageUrl: img("1469334031218-e382a71b716b"),
      categoryId: srajce.id, seasonId: pomlad.id, audienceId: zenske.id,
    },
    {
      slug: "z-kapa-pleten-beret", name: "Pleteni beret",
      description: "Eleganten volneni beret. Francoski šarm.",
      priceCents: 2500, compareAtPriceCents: null, stock: 25,
      // woman in beret hat
      imageUrl: img("1483985988355-763728e1cdb2"),
      categoryId: kape.id, seasonId: jesen.id, audienceId: zenske.id,
    },
    {
      slug: "z-majica-crop-bela", name: "Bela crop majica",
      description: "Kratka crop majica iz mehke jersey tkanine.",
      priceCents: 2200, compareAtPriceCents: null, stock: 22,
      // woman in white crop top
      imageUrl: img("1496747611176-843222e1e57c"),
      categoryId: majice.id, seasonId: poletje.id, audienceId: zenske.id,
    },

    // ── OTROCI ─────────────────────────────────────────────────────────────
    {
      slug: "o-barvita-majica-dino", name: "Dinozaver majica",
      description: "Vesela majica z dinozavri za aktivne otroke.",
      priceCents: 1500, compareAtPriceCents: null, stock: 30,
      imageUrl: src("child,colorful,tshirt,smiling", 11),
      categoryId: majice.id, seasonId: poletje.id, audienceId: otroci.id,
    },
    {
      slug: "o-jeans-hlace-otroci", name: "Otroške jeans hlače",
      description: "Vzdržljive jeans hlače s prilagodljivim pasom.",
      priceCents: 2900, compareAtPriceCents: null, stock: 20,
      imageUrl: src("child,jeans,casual,outdoor", 12),
      categoryId: hlace.id, seasonId: jesen.id, audienceId: otroci.id,
    },
    {
      slug: "o-zimska-jakna-rdeca", name: "Rdeča zimska jakna",
      description: "Topla in vodoodporna zimska jakna. Odsevni detajli za varnost.",
      priceCents: 8900, compareAtPriceCents: 11900, stock: 8,
      imageUrl: src("child,red,winter,jacket", 13),
      categoryId: jakne.id, seasonId: zima.id, audienceId: otroci.id,
    },
    {
      slug: "o-hoodie-rainbow", name: "Mavričasti hoodie",
      description: "Pisani hoodie z mavričnim tiskom. Iz mehke bombaž mešanice.",
      priceCents: 3900, compareAtPriceCents: null, stock: 18,
      imageUrl: src("child,hoodie,colorful,happy", 14),
      categoryId: jopici.id, seasonId: jesen.id, audienceId: otroci.id,
    },
    {
      slug: "o-tshirt-zvezdice", name: "T-shirt z zvezdami",
      description: "Udoben T-shirt s tiskano zvezdičasto uredbo.",
      priceCents: 1200, compareAtPriceCents: null, stock: 35,
      imageUrl: src("child,tshirt,summer,playing", 15),
      categoryId: tshirt.id, seasonId: poletje.id, audienceId: otroci.id,
    },
    {
      slug: "o-pulover-medved", name: "Pulover z medvedom",
      description: "Topel pulover z aplikacijo medvedka.",
      priceCents: 3500, compareAtPriceCents: null, stock: 12,
      imageUrl: src("child,sweater,knit,cute", 16),
      categoryId: puloverji.id, seasonId: zima.id, audienceId: otroci.id,
    },
    {
      slug: "o-jakna-rumena-pomladna", name: "Rumena pomladna jakna",
      description: "Lahka vetrovka v živahni rumeni barvi.",
      priceCents: 4900, compareAtPriceCents: 5900, stock: 10,
      imageUrl: src("child,yellow,jacket,spring", 17),
      categoryId: jakne.id, seasonId: pomlad.id, audienceId: otroci.id,
    },
    {
      slug: "o-majica-zivali", name: "Majica z živalmi",
      description: "Zabavna majica z ilustriranimi živalmi.",
      priceCents: 1400, compareAtPriceCents: null, stock: 28,
      imageUrl: src("child,animals,shirt,happy", 24),
      categoryId: majice.id, seasonId: poletje.id, audienceId: otroci.id,
    },
    {
      slug: "o-cargo-hlace-otroci", name: "Otroške cargo hlače",
      description: "Praktične hlače z žepi za pustolovske otroke.",
      priceCents: 3200, compareAtPriceCents: null, stock: 14,
      imageUrl: src("child,cargo,pants,adventure", 18),
      categoryId: hlace.id, seasonId: jesen.id, audienceId: otroci.id,
    },
    {
      slug: "o-kapa-pompon-roza", name: "Roza kapa s pomponom",
      description: "Mehka zimska kapa s pomponom. Topla in simpatična.",
      priceCents: 1200, compareAtPriceCents: null, stock: 45,
      imageUrl: src("child,pink,winter,hat", 19),
      categoryId: kape.id, seasonId: zima.id, audienceId: otroci.id,
    },
    {
      slug: "o-komplet-majica-hlace", name: "Komplet majica + hlače",
      description: "Udoben komplet za vsakdanjo nošenje. Elastični pas.",
      priceCents: 4200, compareAtPriceCents: 5500, stock: 9,
      imageUrl: src("child,outfit,fashion,smile", 20),
      categoryId: majice.id, seasonId: pomlad.id, audienceId: otroci.id,
    },
    {
      slug: "o-zimski-pulover-siv", name: "Sivi zimski pulover",
      description: "Topel pulover iz mehke volnene mešanice.",
      priceCents: 3900, compareAtPriceCents: null, stock: 15,
      imageUrl: src("child,grey,sweater,winter", 21),
      categoryId: puloverji.id, seasonId: zima.id, audienceId: otroci.id,
    },
    {
      slug: "o-tshirt-super-hero", name: "Superjunak T-shirt",
      description: "T-shirt s priljubljenimi superjunaki. Darilo za rojstni dan.",
      priceCents: 1500, compareAtPriceCents: null, stock: 40,
      imageUrl: src("child,tshirt,hero,fun", 22),
      categoryId: tshirt.id, seasonId: poletje.id, audienceId: otroci.id,
    },
    {
      slug: "o-jeans-jakna-otroci", name: "Otroška jeans jakna",
      description: "Mini verzija klasične jeans jakne. Trpežna in kul.",
      priceCents: 5900, compareAtPriceCents: null, stock: 7,
      imageUrl: src("child,denim,jacket,cool", 23),
      categoryId: jakne.id, seasonId: pomlad.id, audienceId: otroci.id,
    },
  ];

  let created = 0;
  let updated = 0;
  for (const p of products) {
    const sizes   = sizesFor(p.audienceId, p.categoryId);
    const stocks  = stockPerSize(p.stock, sizes.length);

    const existing = await prisma.product.findUnique({ where: { slug: p.slug }, select: { id: true } });
    if (existing) {
      await prisma.product.update({
        where: { slug: p.slug },
        data: { imageUrl: p.imageUrl, stock: p.stock, priceCents: p.priceCents, compareAtPriceCents: p.compareAtPriceCents, isActive: true },
      });
      // Remove old UNI variant + its cart items before replacing with sized variants
      const uniVariants = await prisma.productVariant.findMany({
        where: { productId: existing.id, size: "UNI" },
        select: { id: true },
      });
      const uniIds = uniVariants.map((v: { id: string }) => v.id);
      if (uniIds.length > 0) {
        await prisma.cartItem.deleteMany({ where: { variantId: { in: uniIds } } });
        await prisma.productVariant.deleteMany({ where: { id: { in: uniIds } } });
      }
      for (let i = 0; i < sizes.length; i++) {
        await prisma.productVariant.upsert({
          where: { productId_size: { productId: existing.id, size: sizes[i] } },
          create: { productId: existing.id, size: sizes[i], stock: stocks[i], isActive: true },
          update: { stock: stocks[i], isActive: true },
        });
      }
      updated++;
    } else {
      await prisma.product.create({
        data: {
          ...p,
          isActive: true,
          variants: {
            create: sizes.map((size, i) => ({ size, stock: stocks[i], isActive: true })),
          },
        },
      });
      created++;
    }
  }

  console.log(`Done. Created: ${created}, Updated: ${updated}. Total: ${products.length} products.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
