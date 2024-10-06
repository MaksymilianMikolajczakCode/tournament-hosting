import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs";

import Competition from "@/components/Competition";


import { fetchCompetitionById} from "@/lib/actions/competition.actions";

async function page({ params }: { params: { id: string } }) {
  if (!params.id) return null;


  const competition = await fetchCompetitionById(params.id);
  const plainCompetition = JSON.parse(JSON.stringify(competition))
  return (
    <section className='relative'>
      <div>
        <Competition
                id={plainCompetition._id}
                title={plainCompetition.title}
                owner={plainCompetition.owner}
                startDate={plainCompetition.startDate}
                players={plainCompetition.players}
                details={plainCompetition.details}
                regulations={plainCompetition.regulations}
                regulationsLink={plainCompetition.regulationsLink}
                type={plainCompetition.type}
                bracket={plainCompetition.bracket}
                round={plainCompetition.round}
              />
      </div>
    </section>
  );
}

export default page;