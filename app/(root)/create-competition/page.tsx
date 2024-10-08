import { currentUser } from '@clerk/nextjs/server'
import { redirect } from "next/navigation";

import PostCompetition from "@/components/forms/PostCompetition";
import { fetchUser } from "@/lib/actions/user.actions";

async function Page() {
  const user = await currentUser();
  if (!user) return null;

  // fetch organization list created by user
  const userInfo = await fetchUser(user.id);

  return (
    <>
      <PostCompetition userId={userInfo._id} />
    </>
  );
}

export default Page;