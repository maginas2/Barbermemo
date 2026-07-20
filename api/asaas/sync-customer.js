import { getAuthedContext } from '../_lib/supabaseServer.js';
import { upsertAsaasCustomer } from '../_lib/asaas.js';

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
  const { supabase, user } = ctx;

  // Defaults to the caller's own account (self-service); an admin session
  // (allowed by RLS the same way adminUpdateBarbeiro already is) can pass
  // a different barberId to sync any barbeiro on their behalf.
  const barberId = (req.body && req.body.barberId) || user.id;

  const { data: barbeiro, error: fetchError } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', barberId)
    .eq('role', 'barbeiro')
    .maybeSingle();

  if (fetchError) {
    res.status(500).json({ error: fetchError.message });
    return;
  }
  if (!barbeiro) {
    res.status(404).json({ error: 'Barbeiro não encontrado ou sem permissão de acesso.' });
    return;
  }

  try {
    const asaasCustomer = await upsertAsaasCustomer({
      id: barbeiro.id,
      nome: barbeiro.nome,
      email: barbeiro.email,
      cpf_cnpj: barbeiro.cpf_cnpj,
      telefone: barbeiro.telefone,
      asaas_customer_id: barbeiro.asaas_customer_id
    });

    const { data: updated, error: updateError } = await supabase
      .from('usuarios')
      .update({ asaas_customer_id: asaasCustomer.id })
      .eq('id', barberId)
      .select()
      .single();

    if (updateError) {
      res.status(500).json({ error: updateError.message });
      return;
    }

    res.status(200).json({ barbeiro: updated, asaasCustomer });
  } catch (err) {
    res.status(err.status && err.status < 500 ? 422 : 502).json({ error: err.message });
  }
}
