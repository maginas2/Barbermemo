import { getAuthedContext } from '../_lib/supabaseServer.js';
import { upsertAsaasCustomer } from '../_lib/asaas.js';

const DELAY_MS = 250; // spaces out calls to respect Asaas rate limits

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido.' });
    return;
  }

  const ctx = await getAuthedContext(req);
  if (ctx.error) {
    res.status(401).json({ error: ctx.error });
    return;
  }
  const { supabase } = ctx;

  // Relies on the same RLS that already lets an admin session list every
  // barbeiro via db.adminGetBarbeiros — a non-admin caller will just get
  // their own row back (or none), so this is safe to run as self-service too.
  const { data: barbeiros, error: fetchError } = await supabase
    .from('usuarios')
    .select('*')
    .eq('role', 'barbeiro');

  if (fetchError) {
    res.status(500).json({ error: fetchError.message });
    return;
  }

  const summary = { total: barbeiros.length, criados: 0, atualizados: 0, falharam: [] };

  for (const barbeiro of barbeiros) {
    try {
      const asaasCustomer = await upsertAsaasCustomer({
        id: barbeiro.id,
        nome: barbeiro.nome,
        email: barbeiro.email,
        cpf_cnpj: barbeiro.cpf_cnpj,
        telefone: barbeiro.telefone,
        asaas_customer_id: barbeiro.asaas_customer_id
      });

      const { error: updateError } = await supabase
        .from('usuarios')
        .update({ asaas_customer_id: asaasCustomer.id })
        .eq('id', barbeiro.id);

      if (updateError) throw updateError;

      if (barbeiro.asaas_customer_id) {
        summary.atualizados += 1;
      } else {
        summary.criados += 1;
      }
    } catch (err) {
      summary.falharam.push({ barberId: barbeiro.id, nome: barbeiro.nome, erro: err.message });
    }

    await sleep(DELAY_MS);
  }

  res.status(200).json(summary);
}
