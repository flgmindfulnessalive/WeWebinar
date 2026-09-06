export default async function CheckoutComplete({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  if (status === "success") {
    return <p>Pago recibido. Estamos activando tu cuenta.</p>;
  }

  return <p>El pago no se completó. Vuelve a intentarlo.</p>;
}
