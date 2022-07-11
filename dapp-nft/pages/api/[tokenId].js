// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

export default function handler(req, res) {
  const tokenId = req.query.tokenId;
  const name = `WanShiTong #${tokenId}`;
  const description =
    'WanShiTong NFT is a collection for frens of "He who knows 10,0000 things"';
  const image = `https://raw.githubusercontent.com/script8888/WanShiTong/main/${tokenId}.jpg`;

  return res.json({
    name: name,
    description: description,
    image: image,
  });
}
