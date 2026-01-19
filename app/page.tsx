import Image from "next/image";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white font-sans">
      <main className="flex flex-col items-center justify-center px-8 py-16 text-center">
        <Image
          src="/yolo-logo.png"
          alt="YOLO JAPAN"
          width={120}
          height={120}
          priority
        />
        <h1 className="mt-6 text-2xl font-bold text-gray-900">
          YOLO JAPAN
        </h1>
        <p className="mt-3 text-base text-gray-600">
          日本で暮らすあなたをサポート
        </p>
      </main>
    </div>
  );
}
