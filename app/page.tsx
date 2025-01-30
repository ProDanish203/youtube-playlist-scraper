"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { ChangeEvent, FormEvent, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";
import axios from "axios";

interface VideoData {
  title: string;
  views: number;
  thumbnail: string;
}

interface GraphData {
  name: string;
  views: number;
}

export default function Home() {
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [videoData, setVideoData] = useState<VideoData[]>([]);
  const [graphData, setGraphData] = useState<GraphData[]>([]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!playlistUrl) return toast.error("Please provide a valid playlist URL");
    try {
      setIsLoading(true);
      const { data } = await axios.post("/api/scraper/scrape-playlist", {
        playlistUrl,
      });

      if (!data)
        return toast.error("An error occurred. Please try again later");

      setVideoData(data.videoList);
      setGraphData(data.graphData);
      console.log(data);
    } catch (error) {
      console.error(error);
      toast.error("An error occurred. Please try again later");
    } finally {
      setIsLoading(false);
    }
  };

  const formatViews = (views: number) => {
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M`;
    } else if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K`;
    } else {
      return views.toString();
    }
  };

  return (
    <main className="container w-full">
      <Card>
        <CardHeader>
          <CardTitle>YouTube Playlist Analyzer</CardTitle>
          <CardDescription>
            Enter a YouTube playlist URL to analyze its videos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="url"
              placeholder="Enter YouTube playlist URL"
              value={playlistUrl}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setPlaylistUrl(e.target.value)
              }
              required
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Analyzing..." : "Analyze Playlist"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {videoData.length > 0 && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Video List</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {videoData.map((video, index) => (
                  <li key={index} className="flex items-start space-x-4">
                    <span className="font-bold text-lg min-w-[24px]">
                      {index + 1}.
                    </span>
                    <Image
                      src={video.thumbnail}
                      alt={video.title}
                      width={120}
                      height={90}
                      className="w-24 h-auto rounded-md"
                    />
                    <div>
                      <h3 className="font-semibold">{video.title}</h3>
                      <p className="text-sm text-gray-600">
                        {formatViews(video.views)} views
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>View Count Graph</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={graphData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="views"
                    stroke="#8884d8"
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}
