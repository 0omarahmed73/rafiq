import { Link, useNavigate, useParams } from 'react-router-dom';
import { practiceById } from '../../content/practices';
import { useI18n } from '../../i18n/LanguageProvider';
import { PracticeRunner } from './PracticeRunner';

export function PracticePage() {
  const { t } = useI18n();
  const { practiceId = '' } = useParams();
  const navigate = useNavigate();
  const def = practiceById(practiceId);

  if (!def) {
    return (
      <div className="flex flex-col gap-3">
        <p>{t({ ar: 'هذا التمرين غير موجود', en: 'This practice does not exist' })}</p>
        <Link to="/journey" className="flex min-h-11 items-center font-semibold text-teal">
          {t({ ar: 'العودة إلى الرحلة', en: 'Back to the journey' })}
        </Link>
      </div>
    );
  }
  return <PracticeRunner def={def} onFinished={(record) => def.stepId === 4 ? navigate('/triggers', { replace: true, state: { savedRecordId: record.id } }) : navigate(`/step/${def.stepId}`)} />;
}
