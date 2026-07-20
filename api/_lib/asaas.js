const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';
const ASAAS_API_KEY = process.env.ASAAS_API_KEY || '';

export async function asaasFetch(path, options = {}) {
  const res = await fetch(`${ASAAS_API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      // Asaas rejects requests without a User-Agent (returns invalid_access_token
      // instead of a clearer error), and Node's fetch sends none by default.
      'User-Agent': 'Barbermemo/1.0',
      access_token: ASAAS_API_KEY,
      ...options.headers
    }
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = data?.errors?.map((e) => e.description).join(' ') || 'Erro na comunicação com o Asaas.';
    const err = new Error(message);
    err.asaasErrors = data?.errors;
    err.status = res.status;
    throw err;
  }

  return data;
}

// Creates or updates the Asaas customer for a local `cliente` row.
export async function upsertAsaasCustomer(cliente) {
  const payload = {
    name: cliente.nome,
    cpfCnpj: cliente.cpf_cnpj || undefined,
    email: cliente.email || undefined,
    mobilePhone: cliente.telefone || undefined,
    externalReference: cliente.id
  };

  if (cliente.asaas_customer_id) {
    return asaasFetch(`/customers/${cliente.asaas_customer_id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  return asaasFetch('/customers', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}
