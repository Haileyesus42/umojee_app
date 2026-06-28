import userTwo from '../../../images/user/user-05.png';
import userOne from '../../../images/user/user-06.png';

interface PeoplesCircleProps {
  total: number;
}

function PeoplesCircle({ total }: PeoplesCircleProps) {
  return (
    <div>
      {total === 1 && (
        <div className="sm:ml-5">
          <img src={userOne} alt="profile" className="h-6 w-6 rounded-full" />
        </div>
      )}
      {total === 2 && (
        <div className="flex relative sm:ml-5">
          <img src={userOne} alt="profile" className="h-6 w-6 rounded-full" />
          <img
            src={userTwo}
            alt="profile"
            className="h-6 w-6 rounded-full left-3 absolute"
          />
        </div>
      )}
      {total >= 3 && (
        <div className="flex relative sm:ml-5">
          <img src={userOne} alt="profile" className="h-6 w-6 rounded-full" />
          <img
            src={userTwo}
            alt="profile"
            className="h-6 w-6 rounded-full left-3 absolute"
          />
          <p className="flex items-center justify-center text-white bg-slate-900 rounded-full w-6 h-6 left-6 text-[10px] z-[10] absolute">
            +{total - 2}
          </p>
        </div>
      )}
    </div>
  );
}

export default PeoplesCircle;
