import { Link, useNavigate, useParams } from 'react-router-dom';
import { practiceById } from '../../content/practices';
import { PracticeRunner } from './PracticeRunner';

export function PracticePage() {
  const { practiceId = '' } = useParams();
  const navigate = useNavigate();
  const def = practiceById(practiceId);

  if (!def) {
    return (
      <div className="flex flex-col gap-3">
        <p>هذا التمرين غير موجود</p>
        <Link to="/journey" className="flex min-h-11 items-center font-semibold text-teal">
          العودة إلى الرحلة
        </Link>
      </div>
    );
  }
  return <PracticeRunner def={def} onFinished={(record) => def.stepId === 4 ? navigate('/triggers', { replace: true, state: { savedRecordId: record.id } }) : navigate(`/step/${def.stepId}`)} />;
}
