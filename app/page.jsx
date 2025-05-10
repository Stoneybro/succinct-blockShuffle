"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Menu, ImageUp, Loader2, SquareX,Wifi,BatteryFull,Bluetooth, Volume2, Users } from "lucide-react";
import Autoplay from "embla-carousel-autoplay";
import  {Button} from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import supabase from "@/client/Supabase";
import { motion, AnimatePresence } from "framer-motion";

/* ===========================================================
   Preloader Component (No glitch – two text phases then exit)
============================================================ */
const Preloader = ({ onComplete }) => {

  const [phase, setPhase] = useState(1);
  // Controls whether the text is visible (for fade‐in/out)
  const [showText, setShowText] = useState(true);

  useEffect(() => {

    const timer1 = setTimeout(() => {
      setShowText(false);
    }, 1500);

    const timer2 = setTimeout(() => {
      setPhase(2);
      setShowText(true);
    }, 2500);

    // Keep phase 2 visible for 2 seconds, then trigger phase 3 (exit)
    const timer3 = setTimeout(() => {
      setPhase(3);
    }, 4500);

    // After 1 second of sliding out the overlay, signal completion.
    const timer4 = setTimeout(() => {
      onComplete();
    }, 5500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [onComplete]);

  // Determine the text message based on the phase.
  const message = phase === 1 ?<Image src={"/succinctHero.png"} width={350} height={350} alt="succinct games" />: "#CRISIS OF TRUST";

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 flex items-center justify-center bg-black bg-bluenoise-layer z-50"
        // When phase === 3, fade out the entire overlay.
        animate={phase === 3 ? { opacity: 0 } : { opacity: 1 }}
        transition={{ duration: phase === 3 ? 1 : 0 }}
      >
        <AnimatePresence mode="wait">
          {showText && (
            <motion.span
              key={message}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="text-pink-500 text-[42px] font-anton lg:text-7xl font-bold text-center"
            >
              {message}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};

/* =================================================
   ImageWithLoader Component (used in your carousel)
================================================== */
const ImageWithLoader = (props) => {
  const [isLoading, setIsLoading] = useState(true);
  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="animate-spin" size={24} />
        </div>
      )}
      <Image {...props} onLoadingComplete={() => setIsLoading(false)} />
    </div>
  );
};

/* ==================================================
   Main Page Component (Sliding Puzzle Game)
=================================================== */
export default function Home() {
  // Preloader state – the overlay is shown until it signals completion.
  const [preloaderDone, setPreloaderDone] = useState(false);

  // Game and UI states
  const gridSize = 3;
  const totalTiles = gridSize * gridSize;
  const [tiles, setTiles] = useState([]);
  const [emptyIndex, setEmptyIndex] = useState(totalTiles - 1);
  const [isSolved, setIsSolved] = useState(false);
  const [moves, setMoves] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  // Set to true so that on initial load the complete puzzle image (overlay) is shown.
  const [image, setImage] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);
  const [uploadbutton, setuploadbutton] = useState("idle");
  const [scoreData, setScoreData] = useState({ name: "", score: "" });
  const [showModal, setShowModal] = useState(false);
  const [communityImages, setCommunityImages] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [uploadImageName, setUploadImageName] = useState("");
  const [puzzleImage, setPuzzleImage] = useState("/puzzle-image.jpg");
  const [puzzleImageLoaded, setPuzzleImageLoaded] = useState(false);

  // Dimensions for the puzzle game
  const imageWidth = 600;
  const imageHeight = 800;
  const aspectRatio = imageWidth / imageHeight;
  const containerWidth = 300;
  const containerHeight = containerWidth / aspectRatio;
  const tileWidth = containerWidth / gridSize;
  const tileHeight = containerHeight / gridSize;

  function calculateScore(moves, time) {
    const maxScore = 1000;
    const W_m = 4; // Weight for moves
    const W_t = 2; // Weight for time
    let score = maxScore - (W_m * moves + W_t * time);
    return Math.max(0, Math.min(score, maxScore));
  }

  // Preload the main puzzle image.
  useEffect(() => {
    setPuzzleImageLoaded(false);
    const img = new window.Image();
    img.src = puzzleImage;
    img.onload = () => setPuzzleImageLoaded(true);
    img.onerror = () => setPuzzleImageLoaded(true);
  }, [puzzleImage]);

  const shuffleTiles = () => {
    setIsSolved(false);
    let shuffled;
    do {
      shuffled = Array.from({ length: totalTiles }, (_, i) => i);
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
    } while (!isSolvable(shuffled));
    setTiles(shuffled);
    setEmptyIndex(shuffled.indexOf(totalTiles - 1));
    setMoves(0);
    setTimeElapsed(0);
    setIsPlaying(false);
    setShowModal(false);
  };

  useEffect(() => {
    const initialTiles = Array.from({ length: totalTiles }, (_, i) => i);
    let shuffled = [...initialTiles];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setTiles(shuffled);
    setEmptyIndex(shuffled.indexOf(totalTiles - 1));
    setMoves(0);
    setTimeElapsed(0);
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    let timer;
    if (isPlaying) {
      timer = setInterval(() => {
        setTimeElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const { data, error } = await supabase
        .from("leaderboard")
        .select("*")
        .order("score", { ascending: false })
        .limit(5);
      if (error) {
        console.error("Error fetching leaderboard:", error.message);
      } else {
        setLeaderboard(data);
      }
    };
    fetchLeaderboard();
  }, []);

  // Fetch community images from Supabase.
  const fetchCommunityImages = async () => {
    try {
      console.log("Fetching community images...");
      const { data, error } = await supabase
        .from("community_images")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) {
        console.error("Error fetching community images:", error.message);
        return;
      }
      if (!data || data.length === 0) {
        console.warn("No community images found.");
        setCommunityImages([]);
        return;
      }
      const images = await Promise.all(
        data.map(async (row) => {
          const { data: publicUrlData, error: publicUrlError } = supabase.storage
            .from("community-images")
            .getPublicUrl(row.file_name);
          if (publicUrlError) {
            console.error("Error generating public URL:", publicUrlError.message);
            return null;
          }
          return { url: publicUrlData.publicUrl, uploaderName: row.uploader_name };
        })
      );
      const validImages = images.filter((img) => img !== null);
      console.log("Fetched community images:", validImages);
      setCommunityImages(validImages);
    } catch (err) {
      console.error("Unexpected error fetching community images:", err);
    }
  };

  useEffect(() => {
    fetchCommunityImages();
  }, []);

  const cropImage = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          const targetWidth = 300;
          const targetHeight = 400;
          const targetRatio = targetWidth / targetHeight;
          let cropWidth, cropHeight, offsetX, offsetY;
          const imageRatio = img.width / img.height;
          if (imageRatio > targetRatio) {
            cropHeight = img.height;
            cropWidth = img.height * targetRatio;
            offsetX = (img.width - cropWidth) / 2;
            offsetY = 0;
          } else {
            cropWidth = img.width;
            cropHeight = img.width / targetRatio;
            offsetX = 0;
            offsetY = (img.height - cropHeight) / 2;
          }
          const canvas = document.createElement("canvas");
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(
            img,
            offsetX,
            offsetY,
            cropWidth,
            cropHeight,
            0,
            0,
            targetWidth,
            targetHeight
          );
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error("Canvas is empty"));
              }
            },
            file.type,
            1
          );
        };
        img.onerror = (err) => reject(err);
        img.src = e.target.result;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });

  const uploadImage = async (file, uploaderName) => {
    try {
      setIsUploading(true);
      const croppedBlob = await cropImage(file);
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage
        .from("community-images")
        .upload(fileName, croppedBlob, {
          contentType: file.type,
        });
      if (error) {
        console.error("Error uploading image:", error.message);
      } else {
        const { data: insertData, error: insertError } = await supabase
          .from("community_images")
          .insert([{ uploader_name: uploaderName, file_name: fileName }]);
        if (insertError) {
          console.error("Error saving image metadata:", insertError.message);
        } else {
          fetchCommunityImages();
          const { data: publicUrlData, error: publicUrlError } =
            supabase.storage.from("community-images").getPublicUrl(fileName);
          if (publicUrlError) {
            console.error("Error generating public URL:", publicUrlError.message);
          } else {
            setPuzzleImage(publicUrlData.publicUrl);
            shuffleTiles();
          }
        }
      }
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!uploadImageName) {
        alert("Please enter your name before uploading an image.");
        return;
      }
      await uploadImage(file, uploadImageName);
      setUploadImageName("");
    }
    e.target.value = "";
  };

  const handleUploadButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleCommunityImageClick = (url) => {
    setPuzzleImage(url);
    shuffleTiles();
  };

  const isSolvable = (tilesArray) => {
    let inversions = 0;
    for (let i = 0; i < tilesArray.length - 1; i++) {
      for (let j = i + 1; j < tilesArray.length; j++) {
        if (
          tilesArray[i] !== totalTiles - 1 &&
          tilesArray[j] !== totalTiles - 1 &&
          tilesArray[i] > tilesArray[j]
        ) {
          inversions++;
        }
      }
    }
    if (gridSize % 2 !== 0) {
      return inversions % 2 === 0;
    } else {
      const emptyRow = Math.floor(emptyIndex / gridSize);
      return (inversions + emptyRow) % 2 === 0;
    }
  };

  useEffect(() => {
    if (moves > 0 && tiles.every((tile, index) => tile === index)) {
      setIsSolved(true);
      setIsPlaying(false);
      setScoreData((prevData) => ({
        ...prevData,
        score: calculateScore(moves, timeElapsed),
      }));
      setShowModal(true);
    }
  }, [tiles]);

  const handleTileClick = (index) => {
    if (!isPlaying || isSolved) return;
    const validMoves = getValidMoves(emptyIndex);
    if (validMoves.includes(index)) {
      const newTiles = [...tiles];
      [newTiles[index], newTiles[emptyIndex]] = [
        newTiles[emptyIndex],
        newTiles[index],
      ];
      setTiles(newTiles);
      setEmptyIndex(index);
      setMoves((prev) => prev + 1);
    }
  };

  const getValidMoves = (emptyIdx) => {
    const row = Math.floor(emptyIdx / gridSize);
    const col = emptyIdx % gridSize;
    const movesArr = [];
    if (row > 0) movesArr.push(emptyIdx - gridSize);
    if (row < gridSize - 1) movesArr.push(emptyIdx + gridSize);
    if (col > 0) movesArr.push(emptyIdx - 1);
    if (col < gridSize - 1) movesArr.push(emptyIdx + 1);
    return movesArr;
  };

  const saveScore = async (name, score) => {
    setuploadbutton("loading");
    const { data, error } = await supabase
      .from("leaderboard")
      .insert([{ name, score }]);
    if (error) {
      console.error("Error saving score", error.message);
    } else {
      setuploadbutton("success");
    }
  };

  const handlechange = (e) => {
    setScoreData({
      ...scoreData,
      [e.target.name]: e.target.value,
    });
  };

  // Modified handlePlayPause: when starting the game, hide the overlay.
  const handlePlayPause = () => {
    if (isSolved) {
      shuffleTiles();
      setIsPlaying(true);
    } else {
      if (!isPlaying) {
        setImage(false); // Hide the overlay puzzle image
        setIsPlaying(true);
      } else {
        setIsPlaying(false);
      }
    }
  };

  const handleModalCancel = () => {
    setShowModal(false);
  };

  return (
<div className="relative min-h-screen font-poppins text-black bg-[url('/succinctBackground.png')] gap-2 flex-col itme bg-cover bg-center bg-no-repeat flex items-center ">
{/* Main UI is rendered regardless so its background is visible */}

<div className="w-full   py-1   bg-gradient-to-b from-[#f9f9f9] to-[#dfdddd] shadow-xl flex items-center justify-between px-4 border border-gray-300">
  <div className="text-sm font-semibold">
  BlockShuffle
  </div>
  <div className="flex gap-2 justify-center md:gap-4 items-center">
    <div className=" font-sans font-semibold text-sm flex gap-1"><span className="hidden md:block"> Balance:</span> 100 Credits</div>
    <div className=""><BatteryFull strokeWidth={2} size={16} /></div>
    <div className=""><Bluetooth strokeWidth={2} size={16} /></div>
    <div className=""><Wifi strokeWidth={2} size={16} /></div>
    <div className=""><Volume2 size={16} strokeWidth={2} /></div>
  </div>
</div>
<div className="bg-white rounded-t-lg  h-[85vh] w-[90vw] md:h-[unset] md:w-full md:max-w-[700px] shadow-2xl flex flex-col items-center md:relative">

<div className=" w-full z-20 sticky top-0  rounded-t-lg bg-gradient-to-b from-[#e0e0e0] to-[#b5b5b5]  flex items-center justify-between px-4 ">
  {/* Left: Traffic lights */}
  <div className="flex items-center space-x-2">
    <span className="w-3 h-3 rounded-full bg-red-500 border border-black/20 shadow-inner"></span>
    <span className="w-3 h-3 rounded-full bg-yellow-400 border border-black/20 shadow-inner"></span>
    <span className="w-3 h-3 rounded-full bg-green-500 border border-black/20 shadow-inner"></span>
  </div>

  {/* Center: Icon and text */}
  <div className="flex items-center text-black text-sm font-medium space-x-1">

    <span>BlockShuffle</span>
  </div>

  {/* Right: empty or future icons */}
  <div className="w-6"></div>
</div>
<div className="overflow-y-scroll scrollbar-custom w-full">
<div className="w-full flex flex-col items-center justify-center gap-4 py-4">
        <div className="text-5xl font-anton text-[#ff12c8]">BLOCK SHUFFLE</div>
        <h1 className="text-sm font-poppins text-[#ff12c8] ">Slide, Shuffle, and Solve – Unblock the Chain!</h1>
        <div className="md:absolute right-20 top-36 gap-16  flex md:flex-col justify-between  font-poppins">
          <p className="text-sm p-4 min-w-[80px]  md:w- rounded-md bg-[#ffe3ff] text-[#ff12c8] flex md:flex-col items-start gap-1 "><span className="text-sm">MOVES:</span><span className="md:text-xl md:font-semibold">{moves}</span> </p>
          <p className="text-sm p-4 rounded-md min-w-[80px]  bg-[#ffe3ff] text-[#ff12c8] flex md:flex-col items-start gap-1 "><span className="text-sm">TIME:</span><span className="md:text-xl md:font-semibold">{timeElapsed}s</span></p>
        </div>
        <div
          className="relative bg-[#ffe3ff]"
          style={{
            width: `${containerWidth}px`,
            height: `${containerHeight}px`,
          }}
        >
          {!puzzleImageLoaded && (
            <div className="absolute inset-0 flex justify-center items-center z-20">
              <Loader2 className="animate-spin" size={40} />
            </div>
          )}
          {/* Puzzle overlay image */}
          <Image
            src={puzzleImage}
            fill
            unoptimized
            alt="Puzzle overlay"
            className={`z-10 ${image ? "block" : "hidden"}`}
          />
          {tiles.map((tile, index) => {
            const left = (index % gridSize) * tileWidth;
            const top = Math.floor(index / gridSize) * tileHeight;
            return (
              <div
                key={index}
                className={`absolute ${
                  tile === totalTiles - 1
                    ? "opacity-0 cursor-default"
                    : "cursor-pointer"
                }`}
                onClick={() => handleTileClick(index)}
                style={{
                  width: `${tileWidth}px`,
                  height: `${tileHeight}px`,
                  left: `${left}px`,
                  top: `${top}px`,
                  backgroundImage:
                    tile !== totalTiles - 1 ? `url(${puzzleImage})` : "",
                  backgroundSize: `${gridSize * 100}% ${gridSize * 100}%`,
                  backgroundPosition: `${
                    (tile % gridSize) * (100 / (gridSize - 1))
                  }% ${Math.floor(tile / gridSize) * (100 / (gridSize - 1))}%`,
                }}
              ></div>
            );
          })}
        </div>
        <div className="flex justify-between text-black pt-2 font-poppins w-[300px]">
          <button className="bg-[#ff12c8] text-white py-1 px-4 rounded"  onClick={shuffleTiles}>
            Shuffle
          </button>
          <button className="bg-[#ff12c8] text-white py-1 px-4 rounded"  onClick={handlePlayPause}>
            {isSolved ? "New Game" : isPlaying ? "Pause" : "Play"}
          </button>
          <button className="bg-[#ff12c8] text-white py-1 px-4 rounded"  onClick={() => setImage(!image)}>
            {image ? "Close" : "Original"}
          </button>
        </div>
        <Sheet>
          <SheetTrigger className="absolute w-[80vw] md:w-[unset] flex text-white bottom-0 md:left-2  md:bottom-32   shadow-2xl">
            <button className="bg-[#ff12c8] bg-gradient-to-t from-[#ff12c8] to-[#dfdddd] flex justify-center gap-4 md:gap-1 md:px-2 text-white py-6 md:py-2 w-full rounded items-center"><span className="md:text-sm">PLAY WITH FREINDS</span> <span><Users /></span> </button>
          </SheetTrigger>
          <SheetContent className="overflow-scroll text-[#ff12c8]">
            <div className="flex flex-col gap-10 h-full">
              <div className="flex flex-col gap-6">
                <div className="font-anton font-bold text-2xl pt-8">
                  PLAY WITH COMMUNITY FAN ARTS
                </div>
                <div className="flex justify-center">
                  <Carousel
                    plugins={[
                      Autoplay({
                        delay: 3000,
                      }),
                    ]}
                    opts={{ align: "start" }}
                    className="w-[80%]"
                  >
                    <CarouselContent>
                      {communityImages.length > 0 ? (
                        communityImages.map(({ url, uploaderName }, index) => (
                          <CarouselItem
                            key={index}
                            className="md:basis-1/2 lg:basis-1/3"
                          >
                            <div
                              className="p-1 cursor-pointer"
                              onClick={() => handleCommunityImageClick(url)}
                            >
                              <div className="border-none rounded-none">
                                <div className="flex flex-col gap-1">
                                  <ImageWithLoader
                                    src={url}
                                    alt={`Community image ${index}`}
                                    width={300}
                                    height={400}
                                    className="object-cover"
                                  />
                                  {uploaderName && (
                                    <div className="text-center font-semibold text-lg lg:text-xs">
                                      {uploaderName}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CarouselItem>
                        ))
                      ) : (
                        <div className="text-[#ff12c8]">No images yet.</div>
                      )}
                    </CarouselContent>
                    <CarouselPrevious />
                    <CarouselNext />
                  </Carousel>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="font-anton font-bold text-2xl">
                  OR PLAY WITH YOURS
                </div>
                <input
                  type="text"
                  placeholder="Enter your twitter username"
                  value={uploadImageName}
                  onChange={(e) => setUploadImageName(e.target.value)}
                  className="bg-transparent border rounded border-gray-700 outline-none p-2 text-xs text-black"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
                <Button
                  variant="outline"
                  className="self-start bg-[#ff12c8] text-white"
                  onClick={handleUploadButtonClick}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="animate-spin" /> Uploading...
                    </>
                  ) : (
                    <>
                      <ImageUp /> Upload
                    </>
                  )}
                </Button>
              </div>
              <div>
                <div className="font-anton font-bold text-3xl">LEADERBOARD</div>
                <div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Name</TableHead>
                        <TableHead>Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaderboard?.map((lb) => (
                        <TableRow key={lb?.id}>
                          <TableCell className="font-medium">
                            {lb?.name}
                          </TableCell>
                          <TableCell>{lb?.score}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

          </SheetContent>
        </Sheet>
        {isSolved && showModal && (
          <div className="text-white flex flex-col bg-black font-poppins rounded w-[300px] h-[300px] absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 p-4 z-10">
            <Button
              className="absolute right-2 bg-black top-2 w-4"
              onClick={handleModalCancel}
            >
              <SquareX size={10} />
            </Button>
            <div className="flex flex-col gap-2">
              <div className="text-xl font-semibold">Congratulations 🎊</div>
              <div className="text-xs text-[#ff12c8]">
                You solved the puzzle in {timeElapsed} sec with {moves} moves
              </div>
            </div>
            <div className="text-gray-700 text-sm">
              You scored {scoreData.score === "" ? 0 : scoreData.score}
            </div>
            <div className="my-3 text-xs">
              Type in your name and upload your score to see where you rank among other succinct community members
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="name" className="text-sm font-bold">
                Name{" "}
                <span className="text-gray-700 text-xs font-thin">
                  (twitter username)
                </span>
              </label>
              <input
                className="bg-transparent border rounded border-gray-700 outline-none p-2 text-xs"
                type="text"
                name="name"
                value={scoreData.name}
                onChange={handlechange}
              />
            </div>
            <Button
              className={`self-end mt-auto ${
                uploadbutton === "success" ? "bg-green-500" : "bg-auto"
              }`}
              disabled={uploadbutton === "success" || uploadbutton === "loading"}
              onClick={() => saveScore(scoreData.name, scoreData.score)}
            >
              {uploadbutton === "loading" ? (
                <>
                  <Loader2 className="animate-spin" /> Please wait
                </>
              ) : uploadbutton === "idle" ? (
                <>Upload</>
              ) : (
                <>Uploaded</>
              )}
            </Button>
          </div>
        )}
      </div>
</div>
</div>
      {/* Preloader overlay */}
      {!preloaderDone && <Preloader onComplete={() => setPreloaderDone(true)} />}
    </div>
  );
}
