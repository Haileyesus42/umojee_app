import { Button } from '../common/ui/button';
import { useNavigate } from 'react-router-dom';
import parse from 'html-react-parser';
import { HomeIcon } from '@radix-ui/react-icons';

const ErrorPage = () => {
  const email = (import.meta as any).env.VITE_COMPANY_EMAIL;
  const navigate = useNavigate();
  return (
    <div className="w-screen h-screen flex items-center justify-center p-20 bg-blue-100">
      <div className="w-7/12 flex flex-col items-center justify-center">
        <div className="flex items-center">
          <svg
            className="fill-current text-blue-700 mr-2"
            width="80"
            height="80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 640 512"
          >
            <path d="M381 114.9L186.1 41.8c-16.7-6.2-35.2-5.3-51.1 2.7L89.1 67.4C78 73 77.2 88.5 87.6 95.2l146.9 94.5L136 240 77.8 214.1c-8.7-3.9-18.8-3.7-27.3 .6L18.3 230.8c-9.3 4.7-11.8 16.8-5 24.7l73.1 85.3c6.1 7.1 15 11.2 24.3 11.2H248.4c5 0 9.9-1.2 14.3-3.4L535.6 212.2c46.5-23.3 82.5-63.3 100.8-112C645.9 75 627.2 48 600.2 48H542.8c-20.2 0-40.2 4.8-58.2 14L381 114.9zM0 480c0 17.7 14.3 32 32 32H608c17.7 0 32-14.3 32-32s-14.3-32-32-32H32c-17.7 0-32 14.3-32 32z" />
          </svg>
          <div className="flex flex-col">
            <p className="font-extrabold text-xl">Umoja Airways</p>
            <span className="font-extralight text-[10px] leading-[10px]">
              Travel Company
            </span>
          </div>
        </div>
        <h1 className="text-5xl font-bold mb-20">Oops!</h1>
        <p className="text-xl font-semibold leading-8 italic">
          {parse(
            `We regret to inform you that an error has occurred. Our team is
          already working hard to resolve the issue as quickly as possible. Your experience is important to us, and we want to make it right. If you have any thoughts or suggestions, we would love to hear from you. Please send us an email at <a className="text-blue-500 hover:underline" href="mailto:${email}">email</a>`,
          )}
        </p>
        <Button
          onClick={() => navigate('/', { replace: true })}
          className="mt-10 flex items-center justify-center gap-2 text-xl p-6 rounded-lg leading-3"
        >
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
};

export default ErrorPage;
