import Link from "next/link";

const NotFound = () => {
  return (
    <div className="error-page">
      <div className="error-page-inner">
        <span className="not-found-code">404</span>
        <h2 className="error-title">Página não encontrada</h2>
        <p className="error-desc">
          A página que você procura não existe ou foi movida.
        </p>
        <Link href="/" className="fd-btn fd-btn-primary">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
