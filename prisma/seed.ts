import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../app/generated/prisma/client";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Categories
  const categories = await Promise.all([
    prisma.category.upsert({ where: { slug: "majice" }, update: {}, create: { name: "Majice", slug: "majice" } }),
    prisma.category.upsert({ where: { slug: "hlace" }, update: {}, create: { name: "Hlače", slug: "hlace" } }),
    prisma.category.upsert({ where: { slug: "jakne" }, update: {}, create: { name: "Jakne", slug: "jakne" } }),
    prisma.category.upsert({ where: { slug: "obleke" }, update: {}, create: { name: "Obleke", slug: "obleke" } }),
    prisma.category.upsert({ where: { slug: "puloverji" }, update: {}, create: { name: "Puloverji", slug: "puloverji" } }),
    prisma.category.upsert({ where: { slug: "srajce" }, update: {}, create: { name: "Srajce", slug: "srajce" } }),
  ]);

  const [majice, hlace, jakne, obleke, puloverji, srajce] = categories;

  // Seasons
  const seasons = await Promise.all([
    prisma.season.upsert({ where: { slug: "pomlad" }, update: {}, create: { name: "Pomlad", slug: "pomlad" } }),
    prisma.season.upsert({ where: { slug: "poletje" }, update: {}, create: { name: "Poletje", slug: "poletje" } }),
    prisma.season.upsert({ where: { slug: "jesen" }, update: {}, create: { name: "Jesen", slug: "jesen" } }),
    prisma.season.upsert({ where: { slug: "zima" }, update: {}, create: { name: "Zima", slug: "zima" } }),
  ]);

  const [pomlad, poletje, jesen, zima] = seasons;

  // Audiences
  const audiences = await Promise.all([
    prisma.audience.upsert({ where: { slug: "moski" }, update: {}, create: { name: "Moški", slug: "moski" } }),
    prisma.audience.upsert({ where: { slug: "zenske" }, update: {}, create: { name: "Ženske", slug: "zenske" } }),
    prisma.audience.upsert({ where: { slug: "unisex" }, update: {}, create: { name: "Unisex", slug: "unisex" } }),
  ]);

  const [moski, zenske, unisex] = audiences;

  // Products with Unsplash images
  const products = [
    {
      name: "Bela lanena srajca",
      slug: "bela-lanena-srajca",
      description: "Lahkotna lanena srajca za vroče poletne dni. Sproščen kroj, naravni material.",
      priceCents: 5900,
      stock: 12,
      imageUrl: "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=600&h=800&fit=crop",
      categoryId: srajce.id,
      seasonId: poletje.id,
      audienceId: moski.id,
    },
    {
      name: "Temno modre chino hlače",
      slug: "temno-modre-chino-hlace",
      description: "Klasične chino hlače iz bombažne mešanice. Primerne za pisarno in prosti čas.",
      priceCents: 7900,
      stock: 8,
      imageUrl: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&h=800&fit=crop",
      categoryId: hlace.id,
      seasonId: jesen.id,
      audienceId: moski.id,
    },
    {
      name: "Oversize črna majica",
      slug: "oversize-crna-majica",
      description: "Udobna oversize majica iz 100% organskega bombaža. Minimalistični dizajn.",
      priceCents: 2900,
      stock: 25,
      imageUrl: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600&h=800&fit=crop",
      categoryId: majice.id,
      seasonId: poletje.id,
      audienceId: unisex.id,
    },
    {
      name: "Zimska volnena jakna",
      slug: "zimska-volnena-jakna",
      description: "Topla jakna z volneno podlogo. Eleganten kroj za mestno nošenje.",
      priceCents: 18900,
      stock: 5,
      imageUrl: "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=600&h=800&fit=crop",
      categoryId: jakne.id,
      seasonId: zima.id,
      audienceId: zenske.id,
    },
    {
      name: "Midi obleka v bež barvi",
      slug: "midi-obleka-bez",
      description: "Elegantna midi obleka za posebne priložnosti ali vsakodnevno nošenje.",
      priceCents: 8900,
      stock: 7,
      imageUrl: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&h=800&fit=crop",
      categoryId: obleke.id,
      seasonId: pomlad.id,
      audienceId: zenske.id,
    },
    {
      name: "Merino pulover",
      slug: "merino-pulover",
      description: "Mehak pulover iz merino volne. Naravno termoregulatorno vlakno.",
      priceCents: 12900,
      stock: 10,
      imageUrl: "https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=600&h=800&fit=crop",
      categoryId: puloverji.id,
      seasonId: jesen.id,
      audienceId: unisex.id,
    },
    {
      name: "Lahka pomladno jakna",
      slug: "lahka-pomladna-jakna",
      description: "Vetrovka za spremenljivo pomladansko vreme. Lahka in zložljiva.",
      priceCents: 9900,
      stock: 6,
      imageUrl: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&h=800&fit=crop",
      categoryId: jakne.id,
      seasonId: pomlad.id,
      audienceId: unisex.id,
    },
    {
      name: "Svilena bluza",
      slug: "svilena-bluza",
      description: "Nežna svilena bluza z rahlo prosojnim efektom. Idealna za poletne večere.",
      priceCents: 11500,
      stock: 4,
      imageUrl: "https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=600&h=800&fit=crop",
      categoryId: srajce.id,
      seasonId: poletje.id,
      audienceId: zenske.id,
    },
    {
      name: "Jogger hlače",
      slug: "jogger-hlace",
      description: "Udobne jogger hlače iz franceske piqué tkanine. Sproščen, a urejen videz.",
      priceCents: 5900,
      stock: 15,
      imageUrl: "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=600&h=800&fit=crop",
      categoryId: hlace.id,
      seasonId: pomlad.id,
      audienceId: moski.id,
    },
    {
      name: "Zimska parka",
      slug: "zimska-parka",
      description: "Topla zimska parka s kapuco in polnjenjem iz recikliranega poliestra.",
      priceCents: 22900,
      stock: 3,
      imageUrl: "https://images.unsplash.com/photo-1548126032-079a0fb0099d?w=600&h=800&fit=crop",
      categoryId: jakne.id,
      seasonId: zima.id,
      audienceId: unisex.id,
    },
    {
      name: "Prugasta majica",
      slug: "prugasta-majica",
      description: "Klasična mornarsko prugasta majica iz organskega bombaža.",
      priceCents: 3500,
      stock: 20,
      imageUrl: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600&h=800&fit=crop",
      categoryId: majice.id,
      seasonId: pomlad.id,
      audienceId: unisex.id,
    },
    {
      name: "Jesenski plašč",
      slug: "jesenski-plasc",
      description: "Klasičen kamelni plašč za jesensko in zimsko sezono. Zeitlos dizajn.",
      priceCents: 28900,
      stock: 2,
      imageUrl: "https://images.unsplash.com/photo-1578932750294-f5075e85f44a?w=600&h=800&fit=crop",
      categoryId: jakne.id,
      seasonId: jesen.id,
      audienceId: zenske.id,
    },
    // --- nova oblačila ---
    {
      name: "Bela polo majica",
      slug: "bela-polo-majica",
      description: "Klasična polo majica iz pique bombaža. Primerna za vsako priložnost.",
      priceCents: 4500,
      stock: 18,
      imageUrl: "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=600&h=800&fit=crop",
      categoryId: majice.id,
      seasonId: poletje.id,
      audienceId: moski.id,
    },
    {
      name: "Rjava suknjič",
      slug: "rjava-suknijc",
      description: "Strukturiran suknjič v toplem rjavem odtenku. Popoln za pisarniško okolje.",
      priceCents: 16900,
      stock: 4,
      imageUrl: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&h=800&fit=crop",
      categoryId: jakne.id,
      seasonId: jesen.id,
      audienceId: moski.id,
    },
    {
      name: "Maxi poletna obleka",
      slug: "maxi-poletna-obleka",
      description: "Lahkotna maxi obleka s cvetličnim vzorcem. Za plažo in poletne izlete.",
      priceCents: 7500,
      stock: 9,
      imageUrl: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&h=800&fit=crop",
      categoryId: obleke.id,
      seasonId: poletje.id,
      audienceId: zenske.id,
    },
    {
      name: "Temno sive delovne hlače",
      slug: "temno-sive-delovne-hlace",
      description: "Ravne hlače z rahlim stretching efektom. Idealne za dolge delovne dneve.",
      priceCents: 8500,
      stock: 11,
      imageUrl: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=600&h=800&fit=crop",
      categoryId: hlace.id,
      seasonId: jesen.id,
      audienceId: zenske.id,
    },
    {
      name: "Hoodie z žepom",
      slug: "hoodie-z-zepom",
      description: "Klasičen pulover s kapuco in prednjim žepom. Iz mehke franceske tkanine.",
      priceCents: 6900,
      stock: 22,
      imageUrl: "https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=600&h=800&fit=crop&crop=top",
      categoryId: puloverji.id,
      seasonId: jesen.id,
      audienceId: unisex.id,
    },
    {
      name: "Lanene poletne hlače",
      slug: "lanene-poletne-hlace",
      description: "Široke hlače iz naravnega lanu. Dihajo in ohranjajo svežino v vročini.",
      priceCents: 6500,
      stock: 13,
      imageUrl: "https://images.unsplash.com/photo-1594938298603-c8148c4b4a48?w=600&h=800&fit=crop",
      categoryId: hlace.id,
      seasonId: poletje.id,
      audienceId: unisex.id,
    },
    {
      name: "Zimski turtleneck",
      slug: "zimski-turtleneck",
      description: "Visokogrlni pulover iz volnene mešanice. Toplo in elegantno hkrati.",
      priceCents: 9500,
      stock: 8,
      imageUrl: "https://images.unsplash.com/photo-1608063615781-e2ef8c73d114?w=600&h=800&fit=crop",
      categoryId: puloverji.id,
      seasonId: zima.id,
      audienceId: zenske.id,
    },
    {
      name: "Kratka jeans jakna",
      slug: "kratka-jeans-jakna",
      description: "Klasična jeans jakna skrajšanega kroja. Brezčasen kos za vsako sezono.",
      priceCents: 11900,
      stock: 6,
      imageUrl: "https://images.unsplash.com/photo-1548126032-079a0fb0099d?w=600&h=800&fit=crop&crop=top",
      categoryId: jakne.id,
      seasonId: pomlad.id,
      audienceId: zenske.id,
    },
    {
      name: "Grafična majica",
      slug: "graficna-majica",
      description: "Majica z minimalističnim grafičnim tiskom. Iz mehke jersey tkanine.",
      priceCents: 3200,
      stock: 30,
      imageUrl: "https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=600&h=800&fit=crop",
      categoryId: majice.id,
      seasonId: poletje.id,
      audienceId: unisex.id,
    },
    {
      name: "Formalna bela srajca",
      slug: "formalna-bela-srajca",
      description: "Klasična formalna srajca iz poplin bombaža. Slim fit kroj.",
      priceCents: 6900,
      stock: 14,
      imageUrl: "https://images.unsplash.com/photo-1603252109303-2751441dd157?w=600&h=800&fit=crop",
      categoryId: srajce.id,
      seasonId: pomlad.id,
      audienceId: moski.id,
    },
    {
      name: "Zimska obleka z dolgimi rokavi",
      slug: "zimska-obleka-dolgi-rokavi",
      description: "Topla pletena obleka za zimske mesece. Dolgi rokavi in A-linija.",
      priceCents: 13500,
      stock: 5,
      imageUrl: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600&h=800&fit=crop",
      categoryId: obleke.id,
      seasonId: zima.id,
      audienceId: zenske.id,
    },
    {
      name: "Cargo hlače",
      slug: "cargo-hlace",
      description: "Udobne cargo hlače z bočnimi žepi. Funkcionalne in stilske hkrati.",
      priceCents: 7200,
      stock: 16,
      imageUrl: "https://images.unsplash.com/photo-1517438476312-10d79c077509?w=600&h=800&fit=crop",
      categoryId: hlace.id,
      seasonId: jesen.id,
      audienceId: moski.id,
    },
    {
      name: "Pleteni kardigan",
      slug: "pleteni-kardigan",
      description: "Mehki kardigan z gumbi iz naravne volne. Večplasten videz za hladno vreme.",
      priceCents: 10900,
      stock: 7,
      imageUrl: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600&h=800&fit=crop",
      categoryId: puloverji.id,
      seasonId: zima.id,
      audienceId: zenske.id,
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: { imageUrl: product.imageUrl, stock: product.stock, priceCents: product.priceCents },
      create: { ...product, isActive: true },
    });
  }

  console.log(`Seeded ${products.length} products, ${categories.length} categories, ${seasons.length} seasons, ${audiences.length} audiences.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
