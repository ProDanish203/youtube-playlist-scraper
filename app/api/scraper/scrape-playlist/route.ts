import { NextRequest, NextResponse } from "next/server";
import { PlaywrightCrawler, Dataset } from "crawlee";
import { v4 as uuidv4 } from "uuid";

interface VideoData {
  title: string;
  views: number;
  thumbnail: string;
}

interface PlaylistData {
  videoList: VideoData[];
  graphData: { name: string; views: number }[];
}

export const POST = async (req: NextRequest) => {
  try {
    const { playlistUrl } = await req.json();
    if (!playlistUrl) {
      return NextResponse.json(
        { message: "Please provide a valid playlist URL", success: false },
        { status: 400 }
      );
    }

    const playlistId = new URL(playlistUrl).searchParams.get("list");
    if (!playlistId) {
      return NextResponse.json(
        { message: "Invalid playlist URL", success: false },
        { status: 400 }
      );
    }

    const uuid = uuidv4();
    const dataset = await Dataset.open(`playlist-${uuid}`);

    const crawler = new PlaywrightCrawler({
      maxRequestsPerCrawl: 50,
      async requestHandler({ request, page, log }) {
        log.info(`Requesting ${request.url}`);

        await page.waitForSelector("#contents ytd-playlist-video-renderer", {
          timeout: 30000,
        });

        await page.evaluate(async () => {
          while (true) {
            const oldHeight = document.body.scrollHeight;
            window.scrollTo(0, document.body.scrollHeight);
            await new Promise((resolve) => setTimeout(resolve, 2000));
            if (document.body.scrollHeight === oldHeight) break;
          }
        });

        const videos: VideoData[] = await page.$$eval(
          "#contents ytd-playlist-video-renderer",
          (elements) => {
            return elements.map((elem) => {
              const title =
                elem.querySelector("#video-title")?.textContent?.trim() || "";
              const viewsText =
                elem
                  .querySelector("#video-info > span:nth-child(1)")
                  ?.textContent?.trim() || "";
              const thumbnail = elem.querySelector("img")?.src || "";

              const viewsMatch = viewsText.match(/^([\d,.]+[KMB]?)\s*views?$/i);
              let views = 0;

              if (viewsMatch) {
                const viewString = viewsMatch[1]
                  .toUpperCase()
                  .replace(/,/g, "");
                if (viewString.endsWith("K"))
                  views = parseFloat(viewString) * 1000;
                else if (viewString.endsWith("M"))
                  views = parseFloat(viewString) * 1000000;
                else if (viewString.endsWith("B"))
                  views = parseFloat(viewString) * 1000000000;
                else views = parseInt(viewString);
              }

              return { title, views, thumbnail };
            });
          }
        );

        log.info(`Found ${videos.length} videos in the playlist`);

        await dataset.pushData({ videos });
      },

      failedRequestHandler({ request, log }) {
        log.error(`Request ${request.url} failed too many times.`);
      },
    });

    await crawler.run([
      { url: playlistUrl, uniqueKey: `${playlistUrl}:${uuid}` },
    ]);

    const results = await dataset.getData();
    const videos = (results.items[0]?.videos as VideoData[]) || [];

    const graphData = videos.map((video, index) => ({
      name: `Video ${index + 1}`,
      views: video.views,
    }));

    const playlistData: PlaylistData = {
      videoList: videos,
      graphData: graphData,
    };

    await dataset.drop();

    return NextResponse.json({ playlistData, success: true }, { status: 200 });
  } catch (err: any) {
    console.log(err);
    return NextResponse.json(
      { message: "Something went wrong", success: false },
      { status: 500 }
    );
  }
};
