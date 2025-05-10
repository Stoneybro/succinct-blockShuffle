import { Anton, Poppins, Domine} from "next/font/google";
import "./globals.css";


const anton = Anton({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-anton', // Define CSS variable
});

const poppins = Poppins({
  weight: ['400','500','600','800','900', '700'],
  subsets: ['latin'],
  variable: '--font-poppins', // Define CSS variable
});
const domine = Domine({
  subsets: ['latin'],
  weight: ['400', '700'], // Adjust as needed
});
export const metadata = {
  title: "SUCCINCT",
  description: "CREATED FOR THE SUCCINCT CHALLENGE",
};
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${anton.variable}  ${poppins.variable}  antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
