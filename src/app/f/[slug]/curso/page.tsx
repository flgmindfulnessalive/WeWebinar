import { permanentRedirect } from "next/navigation";

// The gift page moved to /<slug>/regalo, which is what it is: the page a
// distributor shares to hand out funnels. /curso was its first name, from
// when the course was the whole offer.
//
// A permanent redirect rather than a deleted route, because this link is in
// circulation -- in WhatsApp threads, in bios, in ad creatives already
// approved -- and the referral is stamped on the page it lands on. Breaking
// it would silently stop attributing a distributor's own traffic.
export default async function CourseRoomLegacyRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  permanentRedirect(`/${slug}/regalo`);
}
