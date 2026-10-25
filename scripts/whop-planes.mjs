// Qué planes ve nuestra clave de Whop, y si los que tenemos configurados
// están entre ellos.
//
// Existe porque el checkout de la licencia Distribuidor falla con «Plan
// not found» y no había forma de saber si el id es de otro negocio, está
// archivado o está mal copiado. Reconstruir la llamada a mano con curl no
// sirvió --- el SDK pone cabeceras de versión y rutas por su cuenta ---,
// así que esto usa el mismo SDK que la aplicación y no una imitación.
//
//   WHOP_API_KEY=... WHOP_ACCOUNT_ID=biz_... node scripts/whop-planes.mjs
//
// No escribe nada ni cobra nada: solo pregunta.
import { WhopClient } from "@whop/sdk";

const token = process.env.WHOP_API_KEY?.trim();
const accountId = process.env.WHOP_ACCOUNT_ID?.trim();

if (!token) {
  console.error("Falta WHOP_API_KEY.");
  process.exit(1);
}

const client = new WhopClient({ token });

const configurados = {
  publico:
    process.env.WHOP_WEFUNNELS_DISTRIBUTOR_PLAN_ID_PUBLIC?.trim() ||
    process.env.WHOP_WEFUNNELS_DISTRIBUTOR_PLAN_ID?.trim() ||
    null,
  invitacion: process.env.WHOP_WEFUNNELS_DISTRIBUTOR_PLAN_ID_INVITED?.trim() || null,
};

console.log("Configurado ahora:");
for (const [cual, id] of Object.entries(configurados)) {
  console.log(`  ${cual.padEnd(11)} ${id ?? "(sin poner)"}`);
}

// Uno por uno, para que un id malo no tape al otro.
for (const [cual, id] of Object.entries(configurados)) {
  if (!id) continue;
  try {
    const plan = await client.plans.retrieve({ id });
    console.log(`\nOK  ${cual}: ${id} existe`);
    console.log(`    ${JSON.stringify(plan).slice(0, 400)}`);
  } catch (err) {
    console.log(
      `\nNO  ${cual}: ${id} -> ${err?.statusCode ?? "?"} ${JSON.stringify(err?.body ?? err?.message)}`
    );
  }
}

if (!accountId) {
  console.log("\nSin WHOP_ACCOUNT_ID no puedo listar los planes del negocio.");
  process.exit(0);
}

console.log(`\nPlanes que esta clave ve en ${accountId}:`);
try {
  const page = await client.plans.list({ account_id: accountId });
  let n = 0;
  for await (const plan of page) {
    n++;
    const precio = plan.initial_price ?? plan.renewal_price ?? plan.base_price ?? "?";
    console.log(
      `  ${plan.id}  ${String(precio).padStart(8)}  ${plan.plan_type ?? ""}  ${plan.product_id ?? ""}`
    );
    if (n >= 50) break;
  }
  if (n === 0) console.log("  (ninguno)");
} catch (err) {
  console.log(`  fallo: ${err?.statusCode ?? "?"} ${JSON.stringify(err?.body ?? err?.message)}`);
}
