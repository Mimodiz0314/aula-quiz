import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen grain flex items-center justify-center p-4">
      <div className="bg-white/90 backdrop-blur-md rounded-3xl p-8 max-w-2xl w-full shadow-2xl border border-white/20">
        <button onClick={() => navigate(-1)} className="text-brandPrimary font-bold mb-6 hover:underline">
          ← Volver
        </button>

        <h1 className="text-3xl font-black text-ink mb-6">Política de Privacidad</h1>

        <div className="text-ink/80 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          <p>
            <strong>1. Información que recopilamos:</strong><br />
            EduMaster Aula recopila la dirección de correo electrónico y el nombre proporcionados durante el registro, únicamente con el fin de identificar a los docentes y administradores de la plataforma.
          </p>

          <p>
            <strong>2. Uso de la información:</strong><br />
            Los datos recopilados se utilizan exclusivamente para:
            <ul className="list-disc pl-5 mt-2">
              <li>Autenticar el acceso a la plataforma.</li>
              <li>Asociar los cuestionarios, evaluaciones y configuraciones creadas con el docente correspondiente.</li>
              <li>Proveer un identificador en el foro de discusión de la comunidad.</li>
            </ul>
          </p>

          <p>
            <strong>3. Modo Offline y Red Local:</strong><br />
            La aplicación tiene capacidades para funcionar sin internet. En este modo, los datos de las respuestas de los estudiantes se almacenan de manera local y encriptada en el dispositivo del docente, y se sincronizan con nuestros servidores seguros (Firebase) en cuanto se restablece la conexión.
          </p>

          <p>
            <strong>4. Compartir información con terceros:</strong><br />
            EduMaster Aula <strong>NO</strong> comparte, vende ni alquila la información personal de los docentes ni de los estudiantes a terceros bajo ninguna circunstancia.
          </p>

          <p>
            <strong>5. Eliminación de datos:</strong><br />
            Cualquier usuario puede solicitar la eliminación permanente de su cuenta y de todos los datos asociados contactando al administrador del sistema.
          </p>

          <p>
            <strong>6. Consentimiento:</strong><br />
            Al iniciar sesión en la aplicación, aceptas los términos descritos en esta Política de Privacidad, los cuales cumplen con las normativas estándar de protección de datos para aplicaciones educativas.
          </p>
        </div>
      </div>
    </div>
  );
}
