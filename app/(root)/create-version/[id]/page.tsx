
import { auth } from "@clerk/nextjs/server";
import PostVersion from "@/components/forms/PostVersion";

async function Page({ params }: { params: { id: string } }) {
  if (!params.id) return null;
  const { has } = auth()
  const canAccessSettings = has({permission: "org:mod:change"});
  if(!canAccessSettings) return <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-gray-800 bg-opacity-50 z-50">
  <div className="bg-white p-8 rounded-lg shadow-lg">
    <p className="text-red-500 text-center">Only Mods can add Versions</p>
  </div>
</div>
  return (
    <>
      <PostVersion type="create" templateId={params.id}/>
    </>
  );
}

export default Page;