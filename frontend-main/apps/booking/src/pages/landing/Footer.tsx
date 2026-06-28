import React from "react";
import { IMAGES } from "../../assets";
import { Link } from "react-router-dom";

const Footer = () => {
  const data = {
    name: "Umoja Airways",
    footer_description:
      "Ea elit cillum irure sit amet nulla enim consectetur non esse exercitation incididunt aliqua adipisicing.",
    facebook: "www.facebook.com",
    linkedin: "www.linkedin.com",
    instagram: "www.instagram.com",
    twitter: "www.twitter.com",
    address: "New York, USA",
    email: "umojaairways@nditsolutions.com",
    mobile: "1 2023232323",
  };

  return (
    <footer className="mt-20 bg-slate-800 text-gray-300">
      <div className="max-w-screen-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          {/* Column 1: Logo */}
          <div>
              <img
                src={IMAGES.umojaAirwaysLogoWhite}
                alt="Umoja Airlines Logo"
                className="h-8 sm:h-9 lg:h-10 object-contain"
              />
            <p className="mt-2 text-gray-400">
              <span className="font-bold">Seamless Flights</span>, <br />{" "}
              <span className="font-medium">Unforgettable Journeys</span> <br />
              <span className="font-light">We Take You There</span>.
            </p>
          </div>

          {/* Column 2: Links */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">
              Quick Links
            </h3>
            <ul className="w-fit">
              <Link to={"/"} className="mb-2">
                <div className="hover:text-white">Home</div>
              </Link>
              {/* <Link to={"/check-in"} className="mb-2">
                <div className="hover:text-white">Check In</div>
              </Link> */}
              <a href="#search-flight" className="mb-2">
                <div className="hover:text-white cursor-pointer">Book a Flight</div>
              </a>
              <Link to={"/contact-us"} className="mb-2">
                <div className="hover:text-white">Contact Us</div>
              </Link>
            </ul>
          </div>

          {/* Column 3: Support */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Support</h3>
            <ul className="w-fit">
              <Link to={"#"} className="mb-2">
                <div className="hover:text-white">FAQs</div>
              </Link>
              {/* <Link to={"#"} className="mb-2">
                <div className="hover:text-white">Customer Support</div>
              </Link> */}
              <Link to={"#"} className="mb-2">
                <div className="hover:text-white">Refund Policy</div>
              </Link>
              <Link to={"#"} className="mb-2">
                <div className="hover:text-white">Terms of Service</div>
              </Link>
            </ul>
          </div>

          {/* Column 4: Social Media */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">
              Connect with Us
            </h3>

            {/* <div className="flex flex-col xs:flex-row sm:flex-col xl:flex-row gap-2">
              <input
                type="email"
                placeholder="Your email"
                className="px-2 py-2 w-full outline-none rounded-l-md rounded-r-md xs:rounded-r-none sm:rounded-r-md xl:rounded-r-none border-0 text-black"
              />
              <button className="px-4 py-2 bg-yellow-600 text-white rounded-r-md rounded-l-md xs:rounded-l-none sm:rounded-l-md xl:rounded-l-non hover:bg-yellow-500 transition-all duration-500">
                Subscribe
              </button>
            </div> */}
            <div className="mt-6 flex space-x-4">
              <button className="hover:text-white">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M22.675 0h-21.35C.595 0 0 .592 0 1.326v21.348C0 23.408.595 24 1.325 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.657-4.788 1.325 0 2.463.099 2.794.143v3.24h-1.918c-1.504 0-1.796.715-1.796 1.764v2.314h3.588l-.467 3.622h-3.12V24h6.116C23.407 24 24 23.408 24 22.674V1.326C24 .592 23.407 0 22.675 0z" />
                </svg>
              </button>
              <button className="hover:text-white">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  className="h-6 w-6 bi bi-twitter-x"
                  viewBox="0 0 16 16"
                >
                  <path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865z" />
                </svg>
              </button>
              <button className="hover:text-white">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M22.23 0H1.77C.792 0 0 .774 0 1.73v20.54C0 23.226.792 24 1.77 24h20.46C23.208 24 24 23.226 24 22.27V1.73C24 .774 23.208 0 22.23 0zM7.06 20.452H3.56V9.034h3.5v11.418zM5.31 7.602a2.05 2.05 0 01-2.05-2.051c0-1.132.918-2.05 2.05-2.05 1.13 0 2.05.918 2.05 2.05 0 1.133-.918 2.051-2.05 2.051zm14.56 12.85h-3.5v-5.653c0-1.347-.027-3.078-1.876-3.078-1.878 0-2.165 1.464-2.165 2.975v5.756h-3.5V9.034h3.36v1.56h.048c.469-.889 1.615-1.824 3.32-1.824 3.552 0 4.208 2.34 4.208 5.384v6.298z" />
                </svg>
              </button>
              <button className="hover:text-white">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  className="w-6 h-6 bi bi-instagram"
                  viewBox="0 0 16 16"
                >
                  <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.9 3.9 0 0 0-1.417.923A3.9 3.9 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.9 3.9 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.9 3.9 0 0 0-.923-1.417A3.9 3.9 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599s.453.546.598.92c.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.5 2.5 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.5 2.5 0 0 1-.92-.598 2.5 2.5 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233s.008-2.388.046-3.231c.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92s.546-.453.92-.598c.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92m-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217m0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-700 pt-6 text-center">
          <p className="text-gray-400">
            &copy; {new Date().getFullYear()} Umoja Airlines, All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
